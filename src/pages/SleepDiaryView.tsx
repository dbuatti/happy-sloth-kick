import React from 'react';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import { SleepDiaryViewProps, SleepRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import SleepBar from '@/components/SleepBar';
import { useAuth } from '@/context/AuthContext';

const SleepDiaryView: React.FC<SleepDiaryViewProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { allSleepRecords, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useSleepDiary({ userId: currentUserId });

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Sleep Diary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading sleep diary...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Sleep Diary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading sleep diary: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Sleep Diary</CardTitle>
      </CardHeader>
      <CardContent>
        {allSleepRecords.length === 0 ? (
          <p className="text-muted-foreground">No sleep records found. Start tracking your sleep!</p>
        ) : (
          <div className="space-y-4">
            {allSleepRecords.map((record: SleepRecord) => (
              <div key={record.id} className="border rounded-md p-4">
                <h3 className="font-semibold text-lg mb-2">{format(new Date(record.date), 'PPP')}</h3>
                <SleepBar record={record} />
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <p><strong>Bed Time:</strong> {record.bed_time || 'N/A'}</p>
                  <p><strong>Lights Off:</strong> {record.lights_off_time || 'N/A'}</p>
                  <p><strong>Wake Up:</strong> {record.wake_up_time || 'N/A'}</p>
                  <p><strong>Get Out of Bed:</strong> {record.get_out_of_bed_time || 'N/A'}</p>
                  <p><strong>Time to Fall Asleep:</strong> {record.time_to_fall_asleep_minutes || 0} min</p>
                  <p><strong>Interruptions:</strong> {record.sleep_interruptions_count || 0} ({record.sleep_interruptions_duration_minutes || 0} min)</p>
                </div>
              </div>
            ))}
            {hasNextPage && (
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full mt-4"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Load More'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SleepDiaryView;