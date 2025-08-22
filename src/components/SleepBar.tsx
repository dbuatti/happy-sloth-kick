import React from 'react';
import { SleepRecord } from '@/types/task';
import { format, parseISO, differenceInMinutes, addMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface SleepBarProps {
  sleepRecord: SleepRecord;
  onEdit: (record: SleepRecord) => void;
}

const SleepBar: React.FC<SleepBarProps> = ({ sleepRecord, onEdit }) => {
  const bedTime = sleepRecord.bed_time ? parseISO(`2000-01-01T${sleepRecord.bed_time}`) : null;
  const wakeUpTime = sleepRecord.wake_up_time ? parseISO(`2000-01-01T${sleepRecord.wake_up_time}`) : null;
  const lightsOffTime = sleepRecord.lights_off_time ? parseISO(`2000-01-01T${sleepRecord.lights_off_time}`) : null;
  const getOutOfBedTime = sleepRecord.get_out_of_bed_time ? parseISO(`2000-01-01T${sleepRecord.get_out_of_bed_time}`) : null;

  const totalSleepDuration = (bedTime && wakeUpTime && isValid(bedTime) && isValid(wakeUpTime))
    ? differenceInMinutes(wakeUpTime, bedTime)
    : null;

  const timeToFallAsleep = sleepRecord.time_to_fall_asleep_minutes || 0;
  const sleepInterruptionsDuration = sleepRecord.sleep_interruptions_duration_minutes || 0;

  const actualSleepDuration = totalSleepDuration !== null
    ? totalSleepDuration - timeToFallAsleep - sleepInterruptionsDuration
    : null;

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-lg">{format(parseISO(sleepRecord.date), 'MMM d, yyyy')}</h3>
        <Button variant="ghost" size="icon" onClick={() => onEdit(sleepRecord)}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p><strong>Bed Time:</strong> {bedTime ? format(bedTime, 'h:mm a') : 'N/A'}</p>
        <p><strong>Wake Up:</strong> {wakeUpTime ? format(wakeUpTime, 'h:mm a') : 'N/A'}</p>
        <p><strong>Lights Off:</strong> {lightsOffTime ? format(lightsOffTime, 'h:mm a') : 'N/A'}</p>
        <p><strong>Out of Bed:</strong> {getOutOfBedTime ? format(getOutOfBedTime, 'h:mm a') : 'N/A'}</p>
        <p><strong>Fall Asleep:</strong> {formatDuration(sleepRecord.time_to_fall_asleep_minutes)}</p>
        <p><strong>Interruptions:</strong> {sleepRecord.sleep_interruptions_count || 0} ({formatDuration(sleepRecord.sleep_interruptions_duration_minutes)})</p>
        <p><strong>Total Sleep:</strong> {formatDuration(actualSleepDuration)}</p>
        <p><strong>Planned Wake:</strong> {sleepRecord.planned_wake_up_time ? format(parseISO(`2000-01-01T${sleepRecord.planned_wake_up_time}`), 'h:mm a') : 'N/A'}</p>
      </div>
    </div>
  );
};

export default SleepBar;