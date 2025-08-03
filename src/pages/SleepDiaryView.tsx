import React from 'react';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import SleepBar from '@/components/SleepBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, getWeek, parseISO } from 'date-fns';

const timelineHours = ['6pm', '9pm', 'midnight', '3am', '6am', '9am'];

const SleepDiaryView: React.FC = () => {
  const { records, loading, hasMore, loadMore } = useSleepDiary();

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="sticky top-0 bg-background z-10 py-2">
        <div className="grid grid-cols-[100px_1fr] gap-x-4">
          <div></div>
          <div className="relative grid grid-cols-6 text-center text-xs text-muted-foreground">
            {timelineHours.map(hour => (
              <div key={hour} className="relative">
                <span className="absolute -translate-x-1/2">{hour}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-x-4">
          <div></div>
          <div className="relative grid grid-cols-6 h-2 border-t border-border">
            {timelineHours.map(hour => (
              <div key={`${hour}-tick`} className="relative border-l border-border"></div>
            ))}
             <div className="relative border-l border-r border-border"></div>
          </div>
        </div>
      </div>

      {/* Diary Entries */}
      <div className="space-y-1">
        {records.map(record => {
          const recordDate = parseISO(record.date);
          return (
            <div key={record.id} className="grid grid-cols-[100px_1fr] gap-x-4 items-center">
              <div className="text-right pr-2">
                <p className="font-bold">{format(recordDate, 'EEE d')}</p>
                <p className="text-xs text-muted-foreground">Week {getWeek(recordDate)}</p>
              </div>
              <div className="relative h-8 bg-muted/50 rounded-md">
                <SleepBar record={record} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading State & Button */}
      {loading && (
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-[100px_1fr] gap-x-4 items-center">
                    <div className="text-right pr-2">
                        <Skeleton className="h-4 w-12 mb-1" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                </div>
            ))}
        </div>
      )}
      {hasMore && !loading && (
        <Button onClick={loadMore} variant="outline" className="w-full">
          Load More
        </Button>
      )}
       {!hasMore && !loading && records.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">End of records.</p>
      )}
    </div>
  );
};

export default SleepDiaryView;