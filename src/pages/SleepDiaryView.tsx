import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import { SleepDiaryViewProps, SleepRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SleepBar from '@/components/SleepBar';
import { format, parseISO } from 'date-fns';

const SleepDiaryView: React.FC<SleepDiaryViewProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    allSleepRecords,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSleepDiary(); // No userId prop needed here, it's handled internally

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading && allSleepRecords.length === 0) {
    return <div className="flex justify-center items-center h-full">Loading sleep diary...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Sleep Diary</h1>

      {allSleepRecords.length === 0 ? (
        <p className="text-center text-gray-500">No sleep records found. Start tracking your sleep!</p>
      ) : (
        <div className="space-y-4">
          {allSleepRecords.map((record: SleepRecord) => (
            <Card key={record.id}>
              <CardHeader>
                <CardTitle>{format(parseISO(record.date), 'PPP')}</CardTitle>
              </CardHeader>
              <CardContent>
                <SleepBar record={record} />
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <p><strong>Bed Time:</strong> {record.bed_time}</p>
                  <p><strong>Lights Off:</strong> {record.lights_off_time}</p>
                  <p><strong>Wake Up:</strong> {record.wake_up_time}</p>
                  <p><strong>Out of Bed:</strong> {record.get_out_of_bed_time}</p>
                  <p><strong>Time to Fall Asleep:</strong> {record.time_to_fall_asleep_minutes || 0} min</p>
                  <p><strong>Interruptions:</strong> {record.sleep_interruptions_count || 0} ({record.sleep_interruptions_duration_minutes || 0} min)</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasNextPage && (
            <div className="flex justify-center mt-4">
              <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading more...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SleepDiaryView;