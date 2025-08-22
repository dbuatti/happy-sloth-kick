import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSleepRecords } from '@/hooks/useSleepRecords';
import { SleepRecord } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SleepBar from '@/components/SleepBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import DatePicker from '@/components/ui/date-picker';
import TimePicker from '@/components/ui/time-picker';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';

interface SleepPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepPage: React.FC<SleepPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const {
    sleepRecords,
    isLoading,
    error,
    addSleepRecord,
    updateSleepRecord,
    deleteSleepRecord,
  } = useSleepRecords({ userId });

  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SleepRecord | null>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [bedTime, setBedTime] = useState<Date | undefined>(undefined);
  const [lightsOffTime, setLightsOffTime] = useState<Date | undefined>(undefined);
  const [wakeUpTime, setWakeUpTime] = useState<Date | undefined>(undefined);
  const [getOutOfBedTime, setGetOutOfBedTime] = useState<Date | undefined>(undefined);
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number | undefined>(undefined);
  const [sleepInterruptionsCount, setSleepInterruptionsCount] = useState<number | undefined>(undefined);
  const [sleepInterruptionsDurationMinutes, setSleepInterruptionsDurationMinutes] = useState<number | undefined>(undefined);
  const [timesLeftBedCount, setTimesLeftBedCount] = useState<number | undefined>(undefined);
  const [plannedWakeUpTime, setPlannedWakeUpTime] = useState<Date | undefined>(undefined);

  const resetForm = () => {
    setDate(new Date());
    setBedTime(undefined);
    setLightsOffTime(undefined);
    setWakeUpTime(undefined);
    setGetOutOfBedTime(undefined);
    setTimeToFallAsleepMinutes(undefined);
    setSleepInterruptionsCount(undefined);
    setSleepInterruptionsDurationMinutes(undefined);
    setTimesLeftBedCount(undefined);
    setPlannedWakeUpTime(undefined);
  };

  const handleOpenDialog = (record: SleepRecord | null) => {
    setEditingRecord(record);
    if (record) {
      setDate(parseISO(record.date));
      setBedTime(record.bed_time ? parseISO(`2000-01-01T${record.bed_time}`) : undefined);
      setLightsOffTime(record.lights_off_time ? parseISO(`2000-01-01T${record.lights_off_time}`) : undefined);
      setWakeUpTime(record.wake_up_time ? parseISO(`2000-01-01T${record.wake_up_time}`) : undefined);
      setGetOutOfBedTime(record.get_out_of_bed_time ? parseISO(`2000-01-01T${record.get_out_of_bed_time}`) : undefined);
      setTimeToFallAsleepMinutes(record.time_to_fall_asleep_minutes || undefined);
      setSleepInterruptionsCount(record.sleep_interruptions_count || undefined);
      setSleepInterruptionsDurationMinutes(record.sleep_interruptions_duration_minutes || undefined);
      setTimesLeftBedCount(record.times_left_bed_count || undefined);
      setPlannedWakeUpTime(record.planned_wake_up_time ? parseISO(`2000-01-01T${record.planned_wake_up_time}`) : undefined);
    } else {
      resetForm();
    }
    setIsRecordDialogOpen(true);
  };

  const handleSaveRecord = async () => {
    if (!date) {
      showError('Date is required.');
      return;
    }

    const recordData: Partial<SleepRecord> = {
      date: format(date, 'yyyy-MM-dd'),
      bed_time: bedTime ? format(bedTime, 'HH:mm:ss') : null,
      lights_off_time: lightsOffTime ? format(lightsOffTime, 'HH:mm:ss') : null,
      wake_up_time: wakeUpTime ? format(wakeUpTime, 'HH:mm:ss') : null,
      get_out_of_bed_time: getOutOfBedTime ? format(getOutOfBedTime, 'HH:mm:ss') : null,
      time_to_fall_asleep_minutes: timeToFallAsleepMinutes || null,
      sleep_interruptions_count: sleepInterruptionsCount || null,
      sleep_interruptions_duration_minutes: sleepInterruptionsDurationMinutes || null,
      times_left_bed_count: timesLeftBedCount || null,
      planned_wake_up_time: plannedWakeUpTime ? format(plannedWakeUpTime, 'HH:mm:ss') : null,
      user_id: userId!,
    };

    try {
      if (editingRecord) {
        await updateSleepRecord(editingRecord.id, recordData);
        showSuccess('Sleep record updated successfully!');
      } else {
        await addSleepRecord(recordData);
        showSuccess('Sleep record added successfully!');
      }
      setIsRecordDialogOpen(false);
    } catch (error: any) {
      showError('Failed to save sleep record.');
      console.error('Error saving sleep record:', error);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    await deleteSleepRecord(recordId);
    showSuccess('Sleep record deleted successfully!');
  };

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading sleep records...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading sleep records: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Sleep Tracker</h1>

      <Button onClick={() => handleOpenDialog(null)} className="mb-6 self-start">
        <Plus className="mr-2 h-4 w-4" /> Add New Sleep Record
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sleepRecords.length === 0 ? (
          <p className="text-center text-gray-500 col-span-full">No sleep records yet. Add your first entry!</p>
        ) : (
          sleepRecords.map((record: SleepRecord) => (
            <SleepBar key={record.id} sleepRecord={record} onEdit={handleOpenDialog} />
          ))
        )}
      </div>

      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Sleep Record' : 'Add New Sleep Record'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <div className="col-span-3">
                <DatePicker date={date} setDate={setDate} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bed-time" className="text-right">Bed Time</Label>
              <div className="col-span-3">
                <TimePicker date={bedTime} setDate={setBedTime} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lights-off-time" className="text-right">Lights Off Time</Label>
              <div className="col-span-3">
                <TimePicker date={lightsOffTime} setDate={setLightsOffTime} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wake-up-time" className="text-right">Wake Up Time</Label>
              <div className="col-span-3">
                <TimePicker date={wakeUpTime} setDate={setWakeUpTime} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="get-out-of-bed-time" className="text-right">Get Out of Bed Time</Label>
              <div className="col-span-3">
                <TimePicker date={getOutOfBedTime} setDate={setGetOutOfBedTime} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time-to-fall-asleep" className="text-right">Time to Fall Asleep (min)</Label>
              <Input
                id="time-to-fall-asleep"
                type="number"
                value={timeToFallAsleepMinutes || ''}
                onChange={(e) => setTimeToFallAsleepMinutes(parseInt(e.target.value) || undefined)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interruptions-count" className="text-right">Interruptions Count</Label>
              <Input
                id="interruptions-count"
                type="number"
                value={sleepInterruptionsCount || ''}
                onChange={(e) => setSleepInterruptionsCount(parseInt(e.target.value) || undefined)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interruptions-duration" className="text-right">Interruptions Duration (min)</Label>
              <Input
                id="interruptions-duration"
                type="number"
                value={sleepInterruptionsDurationMinutes || ''}
                onChange={(e) => setSleepInterruptionsDurationMinutes(parseInt(e.target.value) || undefined)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="times-left-bed" className="text-right">Times Left Bed</Label>
              <Input
                id="times-left-bed"
                type="number"
                value={timesLeftBedCount || ''}
                onChange={(e) => setTimesLeftBedCount(parseInt(e.target.value) || undefined)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="planned-wake-up-time" className="text-right">Planned Wake Up Time</Label>
              <div className="col-span-3">
                <TimePicker date={plannedWakeUpTime} setDate={setPlannedWakeUpTime} />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingRecord && (
              <Button variant="destructive" onClick={() => handleDeleteRecord(editingRecord.id)}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsRecordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRecord}>
              {editingRecord ? 'Save Changes' : 'Add Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SleepPage;