import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkHour, NewWorkHourData, UpdateWorkHourData } from '@/types';
import { toast } from 'react-hot-toast';
import { Save, Trash2, Edit, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

interface WorkHoursSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  workHours: WorkHour[];
  onSaveWorkHours: (dayOfWeek: string, startTime: string, endTime: string, enabled: boolean) => Promise<void>;
}

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const WorkHoursSettings: React.FC<WorkHoursSettingsProps> = ({ isOpen, onClose, workHours, onSaveWorkHours }) => {
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (editingDay) {
      const currentWorkHour = workHours.find(wh => wh.day_of_week === editingDay);
      if (currentWorkHour) {
        setStartTime(currentWorkHour.start_time.substring(0, 5));
        setEndTime(currentWorkHour.end_time.substring(0, 5));
        setEnabled(currentWorkHour.enabled ?? true);
      } else {
        setStartTime('09:00');
        setEndTime('17:00');
        setEnabled(true);
      }
    }
  }, [editingDay, workHours]);

  const handleSave = async () => {
    if (editingDay) {
      await onSaveWorkHours(editingDay, startTime, endTime, enabled);
      setEditingDay(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Work Hours</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {daysOfWeek.map(day => {
            const currentWorkHour = workHours.find(wh => wh.day_of_week === day);
            const displayStartTime = currentWorkHour?.start_time.substring(0, 5) || '09:00';
            const displayEndTime = currentWorkHour?.end_time.substring(0, 5) || '17:00';
            const displayEnabled = currentWorkHour?.enabled ?? true;

            return (
              <div key={day} className="flex items-center justify-between p-2 border rounded-md">
                <span className="capitalize font-medium">{day}</span>
                {editingDay === day ? (
                  <div className="flex items-center space-x-2">
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-24" />
                    <span>-</span>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-24" />
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                    <Button size="sm" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingDay(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {displayEnabled ? `${displayStartTime} - ${displayEndTime}` : 'Disabled'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setEditingDay(day)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkHoursSettings;