import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkHours } from '@/hooks/useWorkHours';
import { WorkHour, NewWorkHourData, UpdateWorkHourData } from '@/types'; // Corrected imports
import { toast } from 'react-hot-toast';
import { Save, Plus, Trash2 } from 'lucide-react';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const WorkHoursSettings: React.FC = () => {
  const { workHours, isLoading, error, addWorkHour, updateWorkHour, deleteWorkHour } = useWorkHours();

  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (editingDay && workHours) {
      const currentWorkHour = workHours.find(wh => wh.day_of_week === editingDay);
      if (currentWorkHour) {
        setStartTime(currentWorkHour.start_time?.substring(0, 5) || '09:00');
        setEndTime(currentWorkHour.end_time?.substring(0, 5) || '17:00');
        setEnabled(currentWorkHour.enabled ?? true);
      } else {
        setStartTime('09:00');
        setEndTime('17:00');
        setEnabled(true);
      }
    }
  }, [editingDay, workHours]);

  const handleSave = async () => {
    if (!editingDay) return;

    const updates: UpdateWorkHourData = {
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      enabled: enabled,
    };

    try {
      const existingWorkHour = workHours?.find(wh => wh.day_of_week === editingDay);
      if (existingWorkHour) {
        await updateWorkHour({ id: existingWorkHour.id, updates });
        toast.success(`Work hours for ${editingDay} updated!`);
      } else {
        const newWorkHourData: NewWorkHourData = {
          day_of_week: editingDay,
          start_time: startTime + ':00',
          end_time: endTime + ':00',
          enabled: enabled,
        };
        await addWorkHour(newWorkHourData);
        toast.success(`Work hours for ${editingDay} added!`);
      }
      setEditingDay(null);
    } catch (err) {
      toast.error(`Failed to save work hours: ${(err as Error).message}`);
      console.error('Error saving work hours:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete these work hours?')) {
      try {
        await deleteWorkHour(id);
        toast.success('Work hours deleted!');
      } catch (err) {
        toast.error(`Failed to delete work hours: ${(err as Error).message}`);
        console.error('Error deleting work hours:', err);
      }
    }
  };

  if (isLoading) {
    return <Card><CardContent>Loading work hours settings...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="text-red-500">Error: {error.message}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Hours Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const workHour = workHours?.find(wh => wh.day_of_week === day);
            const isEditing = editingDay === day;
            return (
              <div key={day} className="flex items-center justify-between p-2 border rounded-md">
                <span className="capitalize font-medium">{day}</span>
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-24" />
                    <span>-</span>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-24" />
                    <Button size="sm" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingDay(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {workHour ? (
                      workHour.enabled ? (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {workHour.start_time?.substring(0, 5)} - {workHour.end_time?.substring(0, 5)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Disabled</span>
                      )
                    ) : (
                      <span className="text-sm text-gray-500 italic">Not set</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setEditingDay(day)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {workHour && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(workHour.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkHoursSettings;