import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import { SleepDiaryViewProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SleepBar from '@/components/SleepBar';
import { Button } from '@/components/ui/button';

const SleepDiaryView: React.FC<SleepDiaryViewProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    allSleepRecords,
    isLoading,
    error,
    loadMore,
    hasMore,
    isFetchingNextPage,
  } = useSleepDiary({ userId: currentUserId }); // Pass userId as an object

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          loadMore();
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isFetchingNextPage, loadMore]);

  if (isLoading && allSleepRecords.length === 0) {
    return <div className="flex justify-center items-center h-full">Loading sleep diary...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Sleep Diary</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your Sleep History</CardTitle>
        </CardHeader>
        <CardContent>
          {allSleepRecords.length === 0 ? (
            <p className="text-center text-gray-500">No sleep records found for this period.</p>
          ) : (
            <div className="space-y-4">
              {allSleepRecords.map((record) => (
                <SleepBar key={record.id} record={record} />
              ))}
              <div ref={observerTarget} className="h-1" /> {/* Invisible element to observe */}
              {isFetchingNextPage && <p className="text-center text-gray-500">Loading more...</p>}
              {!hasMore && allSleepRecords.length > 0 && <p className="text-center text-gray-500">No more records.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SleepDiaryView;