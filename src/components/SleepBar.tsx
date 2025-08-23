import React from 'react';
import { SleepRecord } => '@/types';
import { format, parseISO, differenceInMinutes, addMinutes, isValid, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SleepBarProps {
  record: SleepRecord;
}

const SleepBar: React.FC<SleepBarProps> = ({ record }) => {
  const bedTime = record.bed_time ? parseISO(`2000-01-01T${record.bed_time}`) : null;
  const lightsOffTime = record.lights_off_time ? parseISO(`2000-01-01T${record.lights_off_time}`) : null;
  const wakeUpTime = record.wake_up_time ? parseISO(`2000-01-01T${record.wake_up_time}`) : null;
  const getOutOfBedTime = record.get_out_of_bed_time ? parseISO(`2000-01-01T${record.get_out_of_bed_time}`) : null;
  const plannedWakeUpTime = record.planned_wake_up_time ? parseISO(`2000-01-01T${record.planned_wake_up_time}`) : null;

  const timeToFallAsleep = record.time_to_fall_asleep_minutes || 0;
  const interruptionsDuration = record.sleep_interruptions_duration_minutes || 0;

  let totalSleepDuration = 0;
  let sleepBarSegments = [];

  if (bedTime && wakeUpTime && isValid(bedTime) && isValid(wakeUpTime)) {
    let adjustedWakeUpTime = wakeUpTime;
    if (isBefore(adjustedWakeUpTime, bedTime)) {
      adjustedWakeUpTime = addMinutes(adjustedWakeUpTime, 24 * 60);
    }
    totalSleepDuration = differenceInMinutes(adjustedWakeUpTime, bedTime);

    // Calculate segments for the sleep bar
    let currentOffset = 0;

    // Time to fall asleep
    if (lightsOffTime && isBefore(bedTime, lightsOffTime)) {
      const duration = differenceInMinutes(lightsOffTime, bedTime);
      sleepBarSegments.push({ type: 'awake-pre', duration, color: 'bg-gray-300' });
      currentOffset += duration;
    }

    if (timeToFallAsleep > 0) {
      sleepBarSegments.push({ type: 'falling-asleep', duration: timeToFallAsleep, color: 'bg-blue-200' });
      currentOffset += timeToFallAsleep;
    }

    // Actual sleep duration (adjusted for interruptions)
    const actualSleepMinutes = totalSleepDuration - timeToFallAsleep - interruptionsDuration;
    if (actualSleepMinutes > 0) {
      sleepBarSegments.push({ type: 'sleep', duration: actualSleepMinutes, color: 'bg-blue-500' });
      currentOffset += actualSleepMinutes;
    }

    // Interruptions
    if (interruptionsDuration > 0) {
      sleepBarSegments.push({ type: 'interruptions', duration: interruptionsDuration, color: 'bg-red-300' });
      currentOffset += interruptionsDuration;
    }

    // Awake post-sleep (if any)
    if (getOutOfBedTime && isAfter(getOutOfBedTime, wakeUpTime)) {
      const duration = differenceInMinutes(getOutOfBedTime, wakeUpTime);
      sleepBarSegments.push({ type: 'awake-post', duration, color: 'bg-gray-300' });
      currentOffset += duration;
    }
  }

  const totalMinutesInDay = 24 * 60; // For relative width calculation

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex w-full h-6 rounded-md overflow-hidden bg-gray-100 cursor-pointer">
            {sleepBarSegments.map((segment, index) => (
              <div
                key={index}
                className={cn("h-full", segment.color)}
                style={{ width: `${(segment.duration / totalMinutesInDay) * 100}%` }}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{format(new Date(record.date), 'PPP')}</p>
          <p>Bed Time: {record.bed_time || 'N/A'}</p>
          <p>Lights Off: {record.lights_off_time || 'N/A'}</p>
          <p>Wake Up: {record.wake_up_time || 'N/A'}</p>
          <p>Get Out of Bed: {record.get_out_of_bed_time || 'N/A'}</p>
          <p>Total Sleep: {totalSleepDuration > 0 ? `${(totalSleepDuration / 60).toFixed(1)} hours` : 'N/A'}</p>
          <p>Time to Fall Asleep: {record.time_to_fall_asleep_minutes || 0} min</p>
          <p>Interruptions: {record.sleep_interruptions_count || 0} ({record.sleep_interruptions_duration_minutes || 0} min)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SleepBar;