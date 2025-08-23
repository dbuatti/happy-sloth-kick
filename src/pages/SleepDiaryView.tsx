import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import { SleepDiaryViewProps, SleepRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SleepBar from '@/components/SleepBar';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const SleepDiaryView: React.FC<SleepDiaryViewProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    sleepRecords,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSleepDiary(currentUserId);

  const observerTarget = useRef(null);

  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading || authLoading) return <p>Loading sleep diary...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Sleep Diary</h2>
      <div className="space-y-4">
        {sleepRecords.length === 0 ? (
          <p className="text-muted-foreground">No sleep records found. Start tracking your sleep!</p>
        ) : (
          sleepRecords.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <CardTitle className="text-lg">{format(new Date(record.date), 'PPP')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <p><strong>Bed Time:</strong> {record.bed_time || 'N/A'}</p>
                  <p><strong>Lights Off:</strong> {record.lights_off_time || 'N/A'}</p>
                  <p><strong>Wake Up:</strong> {record.wake_up_time || 'N/A'}</p>
                  <p><strong>Out of Bed:</strong> {record.get_out_of_bed_time || 'N/A'}</p>
                </div>
                <SleepBar record={record} />
              </CardContent>
            </Card>
          ))
        )}
        <div ref={observerTarget} className="flex justify-center p-4">
          {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin" />}
          {!hasNextPage && sleepRecords.length > 0 && <p className="text-muted-foreground">No more records to load.</p>}
        </div>
      </div>
    </div>
  );
};

export default SleepDiaryView;