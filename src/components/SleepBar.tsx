import React from 'react';
import { SleepRecord } from '@/types'; // Imported from centralized types
import { format, parseISO, differenceInMinutes, addMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

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
    <div className="relative w-full h-8 bg-gray-200 rounded-md overflow-hidden flex items-center text-xs text-white">
      {/* Pre-sleep offset (time in bed before lights off) */}
      {preSleepOffsetPercentage > 0 && (
        <div
          className="h-full bg-gray-400 flex items-center justify-center"
          style={{ width: `${preSleepOffsetPercentage}%` }}
          title={`Time to fall asleep: ${timeToFallAsleep} min`}
        >
          {/* {timeToFallAsleep > 0 && `${timeToFallAsleep}m`} */}
        </div>
      )}

      {/* Actual Sleep */}
      {sleepPercentage > 0 && (
        <div
          className="h-full bg-blue-500 flex items-center justify-center"
          style={{ width: `${sleepPercentage}%` }}
          title={`Total sleep: ${sleepDuration} min`}
        >
          {/* {sleepDuration > 0 && `${sleepDuration}m`} */}
        </div>
      )}

      {/* Interruptions */}
      {interruptionsPercentage > 0 && (
        <div
          className="h-full bg-red-500 flex items-center justify-center"
          style={{ width: `${interruptionsPercentage}%` }}
          title={`Interruptions: ${interruptionsDuration} min`}
        >
          {/* {interruptionsDuration > 0 && `${interruptionsDuration}m`} */}
        </div>
      )}

      {/* Post-sleep offset (time in bed after waking up) */}
      {postSleepOffsetPercentage > 0 && (
        <div
          className="h-full bg-gray-400 flex items-center justify-center"
          style={{ width: `${postSleepOffsetPercentage}%` }}
          title={`Time in bed after waking: ${sleepEndOffset} min`}
        >
          {/* {sleepEndOffset > 0 && `${sleepEndOffset}m`} */}
        </div>
      )}

      <div className="absolute inset-0 flex justify-between items-center px-2 text-gray-800 dark:text-gray-200">
        <span>{format(bedTime, 'HH:mm')}</span>
        <span>{format(adjustedGetOutOfBedTime, 'HH:mm')}</span>
      </div>
    </div>
  );
};

export default SleepBar;