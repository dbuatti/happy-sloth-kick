import React from 'react';
import { SleepRecord } from '@/types'; // Corrected import
import { format, parseISO, differenceInMinutes, addMinutes, isValid } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SleepBarProps {
  record: SleepRecord;
}

const SleepBar: React.FC<SleepBarProps> = ({ record }) => {
  if (!record || !record.bed_time || !record.wake_up_time) {
    return null;
  }

  const bedTime = parseISO(`${record.date}T${record.bed_time}`);
  const wakeUpTime = parseISO(`${record.date}T${record.wake_up_time}`);
  const lightsOffTime = record.lights_off_time ? parseISO(`${record.date}T${record.lights_off_time}`) : bedTime;
  const getOutOfBedTime = record.get_out_of_bed_time ? parseISO(`${record.date}T${record.get_out_of_bed_time}`) : wakeUpTime;

  // Adjust wakeUpTime/getOutOfBedTime if sleep spans across midnight
  let adjustedWakeUpTime = wakeUpTime;
  let adjustedGetOutOfBedTime = getOutOfBedTime;
  if (wakeUpTime.getTime() < bedTime.getTime()) {
    adjustedWakeUpTime = addMinutes(wakeUpTime, 24 * 60);
    adjustedGetOutOfBedTime = addMinutes(getOutOfBedTime, 24 * 60);
  }

  const totalDuration = differenceInMinutes(adjustedGetOutOfBedTime, bedTime);
  const sleepDuration = differenceInMinutes(adjustedWakeUpTime, lightsOffTime) - (record.sleep_interruptions_duration_minutes || 0);
  const timeToFallAsleep = record.time_to_fall_asleep_minutes || 0;

  const sleepEfficiency = totalDuration > 0 ? (sleepDuration / totalDuration) * 100 : 0;

  const bedTimeStr = format(bedTime, 'h:mm a');
  const wakeUpTimeStr = format(adjustedWakeUpTime, 'h:mm a');
  const sleepDurationHours = Math.floor(sleepDuration / 60);
  const sleepDurationMinutes = sleepDuration % 60;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center space-y-1 w-full">
            <div className="text-sm text-gray-500 dark:text-gray-400">{format(parseISO(record.date), 'EEE, MMM d')}</div>
            <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
              <div
                className="absolute h-full bg-blue-500 rounded-full"
                style={{ width: `${sleepEfficiency}%` }}
              ></div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p><strong>Date:</strong> {format(parseISO(record.date), 'PPP')}</p>
          <p><strong>Bed Time:</strong> {bedTimeStr}</p>
          <p><strong>Wake Up Time:</strong> {wakeUpTimeStr}</p>
          <p><strong>Total Sleep:</strong> {sleepDurationHours}h {sleepDurationMinutes}m</p>
          <p><strong>Time to Fall Asleep:</strong> {timeToFallAsleep} min</p>
          <p><strong>Sleep Efficiency:</strong> {sleepEfficiency.toFixed(1)}%</p>
          {record.sleep_interruptions_count && record.sleep_interruptions_count > 0 && (
            <p><strong>Interruptions:</strong> {record.sleep_interruptions_count} ({record.sleep_interruptions_duration_minutes} min)</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SleepBar;