import React from 'react';
import { SleepRecord } from '@/hooks/useSleepRecords';
import { format, parseISO, differenceInMinutes, addMinutes, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from 'lucide-react';

interface SleepBarProps {
  record: SleepRecord;
}

// The timeline view spans from 6 PM to 12 PM (noon) the next day = 18 hours.
const TOTAL_MINUTES_IN_VIEW = 18 * 60;
const VIEW_START_HOUR = 18; // 6 PM

const timeToPercentage = (time: Date) => {
  let hours = time.getHours();
  const minutes = time.getMinutes();
  
  // Adjust hours for the timeline (e.g., 18:00 is 0%, 00:00 is 33.3%, 12:00 is 100%)
  if (hours < VIEW_START_HOUR) {
    hours += 24; // Treat 1 AM as 25, etc.
  }
  
  const minutesFromStart = (hours - VIEW_START_HOUR) * 60 + minutes;
  return (minutesFromStart / TOTAL_MINUTES_IN_VIEW) * 100;
};

const SleepBar: React.FC<SleepBarProps> = ({ record }) => {
  if (!record.bed_time || !record.wake_up_time) {
    return <div className="h-8 flex items-center text-xs text-muted-foreground pl-2">Incomplete data</div>;
  }

  // Parse times, handling overnight logic
  let bedTime = parseISO(`${record.date}T${record.bed_time}`);
  if (bedTime.getHours() >= 12) { // If bed time is in the PM, it's for the previous calendar day's sleep record
      bedTime = addMinutes(bedTime, -1440);
  }
  const wakeUpTime = parseISO(`${record.date}T${record.wake_up_time}`);

  if (!isValid(bedTime) || !isValid(wakeUpTime)) {
    return <div className="h-8 flex items-center text-xs text-muted-foreground pl-2">Invalid time data</div>;
  }

  const timeToFallAsleep = record.time_to_fall_asleep_minutes ?? 0;
  const lightsOffTime = addMinutes(bedTime, timeToFallAsleep);
  const totalSleepMinutes = differenceInMinutes(wakeUpTime, lightsOffTime) - (record.sleep_interruptions_duration_minutes ?? 0);

  const barStartPercent = timeToPercentage(bedTime);
  const barEndPercent = timeToPercentage(wakeUpTime);
  const barWidthPercent = barEndPercent - barStartPercent;

  const timeInBedMinutes = differenceInMinutes(wakeUpTime, bedTime);
  const timeToFallAsleepWidthPercent = timeInBedMinutes > 0 ? (timeToFallAsleep / timeInBedMinutes) * 100 : 0;

  return (
    <div className="h-8 flex items-center" style={{ paddingLeft: `${barStartPercent}%`, width: `${barWidthPercent}%` }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-6 bg-yellow-500 rounded-md flex items-center relative overflow-hidden border border-black/20 cursor-pointer">
            {/* Time to fall asleep */}
            <div className="bg-blue-500 h-full" style={{ width: `${timeToFallAsleepWidthPercent}%` }}></div>
            
            {/* Interruptions */}
            {Array.from({ length: record.sleep_interruptions_count ?? 0 }).map((_, i) => (
              <div key={i} className="absolute h-full w-px bg-black/30" style={{ left: `${timeToFallAsleepWidthPercent + (i + 1) * (100 - timeToFallAsleepWidthPercent) / ((record.sleep_interruptions_count ?? 0) + 1)}%` }}></div>
            ))}

            <span className="absolute left-1/2 -translate-x-1/2 text-xs font-bold text-black mix-blend-overlay whitespace-nowrap">
              {Math.floor(totalSleepMinutes / 60)}h {totalSleepMinutes % 60}m
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p><strong>Date:</strong> {format(parseISO(record.date), 'EEE, MMM d')}</p>
          <p><strong>In Bed:</strong> {format(bedTime, 'p')}</p>
          <p><strong>Asleep:</strong> {format(lightsOffTime, 'p')}</p>
          <p><strong>Woke Up:</strong> {format(wakeUpTime, 'p')}</p>
          <p><strong>Total Sleep:</strong> {Math.floor(totalSleepMinutes / 60)}h {totalSleepMinutes % 60}m</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground ml-2 cursor-pointer flex-shrink-0" />
        </TooltipTrigger>
        <TooltipContent>
            <p>Click the bar for full details</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SleepBar;