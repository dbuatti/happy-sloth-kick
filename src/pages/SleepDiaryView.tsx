import React from 'react';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import SleepBar from '@/components/SleepBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, getWeek, parseISO } from 'date-fns';

interface SleepDiaryViewProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepDiaryView: React.FC<SleepDiaryViewProps> = ({ isDemo = false, demoUserId }) => {
  const { records, loading, hasMore, loadMore } = useSleepDiary({ userId: demoUserId });

  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-background z-10 py-2 px-2 md:px-0">
        <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-x-4">
          <div className="hidden md:block"></div>
          <div className="relative grid grid-cols-6 text-center text-xs text-muted-foreground">
            {timelineHours.map(hour => (
              <div key={hour} className="relative">
                <span className="absolute -translate-x-1/2">{hour}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-x-4 mt-1">
          <div className="hidden md:block"></div>
          <div className="relative grid grid-cols-6 h-2 border-t border-border">
            {timelineHours.map(hour => (
              <div key={`${hour}-tick`} className="relative border-l border-border"></div>
            ))}
             <div className="relative border-l border-r border-border"></div>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-2 md:px-0">
        {records.map((record: any) => {
          const recordDate = parseISO(record.date);
          return (
            <div key={record.id} className="md:grid md:grid-cols-[100px_1fr] md:gap-x-4 md:items-center p-2 rounded-lg bg-muted/30 md:bg-transparent md:p-0">
              <div className="flex justify-between items-baseline md:text-right md:pr-2 mb-1 md:mb-0">
                <p className="font-bold">{format(recordDate, 'EEE d')}</p>
                <p className="text-xs text-muted-foreground">Week {getWeek(recordDate)}</p>
              </div>
              <div className="relative h-8 bg-background md:bg-muted/50 rounded-md">
                <SleepBar record={record} />
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="space-y-2 px-2 md:px-0">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="md:grid md:grid-cols-[100px_1fr] md:gap-x-4 md:items-center p-2 rounded-lg bg-muted/30 md:bg-transparent md:p-0">
                    <div className="flex justify-between items-baseline md:text-right md:pr-2 mb-1 md:mb-0">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                </div>
            ))}
        </div>
      )}
      {hasMore && !loading && (
        <div className="px-2 md:px-0">
          <Button onClick={loadMore} variant="outline" className="w-full" disabled={isDemo}>
            Load More
          </Button>
        </div>
      )}
       {!hasMore && !loading && records.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">End of records.</p>
      )}
    </div>
  );
};

const timelineHours = ['6pm', '9pm', 'midnight', '3am', '6am', '9am'];

export default SleepDiaryView;