import React from 'react';
import { SleepRecord } from '@/types';
import { format, parseISO, differenceInMinutes, addMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SleepBarProps {
  record: SleepRecord;
}

const SleepBar: React.FC<SleepBarProps> = ({ record }) => {
  const bedTime = record.bed_time ? parseISO(`2000-01-01T${record.bed_time}`) : null;
  let lightsOffTime = record.lights_off_time ? parseISO(`2000-01-01T${record.lights_off_time}`) : null;
  let wakeUpTime = record.wake_up_time ? parseISO(`2000-01-01T${record.wake_up_time}`) : null;
  let getOutOfBedTime = record.get_out_of_bed_time ? parseISO(`2000-01-01T${record.get_out_of_bed_time}`) : null;

  if (!bedTime || !lightsOffTime || !wakeUpTime || !getOutOfBedTime ||
      !isValid(bedTime) || !isValid(lightsOffTime) || !isValid(wakeUpTime) || !isValid(getOutOfBedTime)) {
    return <div className="h-8 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">Incomplete Data</div>;
  }

  // Adjust times if they cross midnight
  if (lightsOffTime.getTime() < bedTime.getTime()) {
    lightsOffTime = addMinutes(lightsOffTime, 24 * 60);
  }
  if (wakeUpTime.getTime() < bedTime.getTime()) {
    wakeUpTime = addMinutes(wakeUpTime, 24 * 60);
  }
  if (getOutOfBedTime.getTime() < bedTime.getTime()) {
    getOutOfBedTime = addMinutes(getOutOfBedTime, 24 * 60);
  }

  const totalDuration = differenceInMinutes(getOutOfBedTime, bedTime);
  if (totalDuration <= 0) {
    return <div className="h-8 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">Invalid Duration</div>;
  }

  const sleepStartOffset = differenceInMinutes(lightsOffTime, bedTime);
  const sleepDuration = differenceInMinutes(wakeUpTime, lightsOffTime);
  const sleepEndOffset = differenceInMinutes(getOutOfBedTime, wakeUpTime);

  const timeToFallAsleep = record.time_to_fall_asleep_minutes || 0;
  const interruptionsDuration = record.sleep_interruptions_duration_minutes || 0;

  const preSleepOffsetPercentage = (sleepStartOffset / totalDuration) * 100;
  const sleepPercentage = (sleepDuration / totalDuration) * 100;
  const interruptionsPercentage = (interruptionsDuration / totalDuration) * 100;
  const postSleepOffsetPercentage = (sleepEndOffset / totalDuration) * 100;


  return (
    <TooltipProvider>
      <div className="relative flex h-8 w-full rounded-md overflow-hidden bg-gray-200">
        {preSleepOffsetPercentage > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-gray-400 h-full"
                style={{ width: `${preSleepOffsetPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Time to fall asleep: {sleepStartOffset} min</p>
            </TooltipContent>
          </Tooltip>
        )}
        {sleepPercentage > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${sleepPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Sleep duration: {sleepDuration} min</p>
            </TooltipContent>
          </Tooltip>
        )}
        {interruptionsPercentage > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-red-500 h-full"
                style={{ width: `${interruptionsPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Interruptions: {record.sleep_interruptions_count} times, {interruptionsDuration} min</p>
            </TooltipContent>
          </Tooltip>
        )}
        {postSleepOffsetPercentage > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="bg-gray-400 h-full"
                style={{ width: `${postSleepOffsetPercentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Time in bed after waking: {sleepEndOffset} min</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SleepBar;