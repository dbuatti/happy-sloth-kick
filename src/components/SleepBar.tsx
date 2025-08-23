import React from 'react';
import { SleepRecord } from '@/types'; // Imported from centralized types
import { format, parseISO, differenceInMinutes, addMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Added Tooltip imports

interface SleepBarProps {
  record: SleepRecord;
}

const SleepBar: React.FC<SleepBarProps> = ({ record }) => {
  const bedTime = record.bed_time ? parseISO(`2000-01-01T${record.bed_time}`) : null;
  const lightsOffTime = record.lights_off_time ? parseISO(`2000-01-01T${record.lights_off_time}`) : null;
  const wakeUpTime = record.wake_up_time ? parseISO(`2000-01-01T${record.wake_up_time}`) : null;
  const getOutOfBedTime = record.get_out_of_bed_time ? parseISO(`2000-01-01T${record.get_out_of_bed_time}`) : null;

  if (!bedTime || !lightsOffTime || !wakeUpTime || !getOutOfBedTime || !isValid(bedTime) || !isValid(lightsOffTime) || !isValid(wakeUpTime) || !isValid(getOutOfBedTime)) {
    return <div className="text-sm text-red-500">Invalid sleep data</div>;
  }

  // Adjust wakeUpTime and getOutOfBedTime if sleep spans across midnight
  let adjustedWakeUpTime = wakeUpTime;
  let adjustedGetOutOfBedTime = getOutOfBedTime;
  if (wakeUpTime.getTime() < bedTime.getTime()) {
    adjustedWakeUpTime = addMinutes(wakeUpTime, 24 * 60);
    adjustedGetOutOfBedTime = addMinutes(getOutOfBedTime, 24 * 60);
  }
  if (lightsOffTime.getTime() < bedTime.getTime()) {
    lightsOffTime = addMinutes(lightsOffTime, 24 * 60);
  }

  const totalDuration = differenceInMinutes(adjustedGetOutOfBedTime, bedTime);
  const sleepDuration = differenceInMinutes(adjustedWakeUpTime, lightsOffTime);
  const timeToFallAsleep = record.time_to_fall_asleep_minutes || 0;
  const interruptionsDuration = record.sleep_interruptions_duration_minutes || 0;

  const sleepStartOffset = differenceInMinutes(lightsOffTime, bedTime);
  const sleepEndOffset = differenceInMinutes(adjustedGetOutOfBedTime, adjustedWakeUpTime);

  const sleepPercentage = (sleepDuration / totalDuration) * 100;
  const timeToFallAsleepPercentage = (timeToFallAsleep / totalDuration) * 100;
  const interruptionsPercentage = (interruptionsDuration / totalDuration) * 100;
  const preSleepOffsetPercentage = (sleepStartOffset / totalDuration) * 100;
  const postSleepOffsetPercentage = (sleepEndOffset / totalDuration) * 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center space-y-1 w-full">
            <div className="text-sm text-gray-500 dark:text-gray-400">{format(parseISO(record.date), 'EEE, MMM d')}</div>
            <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
              <div
                className="absolute h-full bg-blue-500 rounded-full"
                style={{ width: `${sleepPercentage}%`, left: `${preSleepOffsetPercentage}%` }}
              ></div>
              {interruptionsPercentage > 0 && (
                <div
                  className="absolute h-full bg-red-500"
                  style={{ width: `${interruptionsPercentage}%`, left: `${preSleepOffsetPercentage + sleepPercentage}%` }}
                ></div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p><strong>Date:</strong> {format(parseISO(record.date), 'PPP')}</p>
          <p><strong>Bed Time:</strong> {format(bedTime, 'h:mm a')}</p>
          <p><strong>Wake Up Time:</strong> {format(adjustedWakeUpTime, 'h:mm a')}</p>
          <p><strong>Total Sleep:</strong> {Math.floor(sleepDuration / 60)}h {sleepDuration % 60}m</p>
          <p><strong>Time to Fall Asleep:</strong> {timeToFallAsleep} min</p>
          <p><strong>Sleep Efficiency:</strong> {((sleepDuration / totalDuration) * 100).toFixed(1)}%</p>
          {record.sleep_interruptions_count && record.sleep_interruptions_count > 0 && (
            <p><strong>Interruptions:</strong> {record.sleep_interruptions_count} ({record.sleep_interruptions_duration_minutes} min)</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SleepBar;