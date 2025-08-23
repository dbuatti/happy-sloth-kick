import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkHour, WorkHoursSettingsProps } from '@/types';
import { toast } from 'react-hot-toast';
import { Save, Trash2, Edit, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const WorkHoursSettings: React.FC<WorkHoursSettingsProps> = ({ isOpen, onClose, workHours, onSaveWorkHours }) => {
  const [localWorkHours, setLocalWorkHours] = useState<WorkHour[]>(workHours);

  useEffect(() => {
    setLocalWorkHours(workHours);
  }, [workHours]);

  const handleTimeChange = (id: string, field: 'start_time' | 'end_time', value: string) => {
    setLocalWorkHours(prev =>
      prev.map(wh => (wh.id === id ? { ...wh, [field]: value } : wh))
    );
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setLocalWorkHours(prev =>
      prev.map(wh => (wh.id === id ? { ...wh, enabled } : wh))
    );
  };

  const handleSave = async () => {
    await onSaveWorkHours(localWorkHours);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Work Hours</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {daysOfWeek.map(day => {
            const workHour = localWorkHours.find(wh => wh.day_of_week === day);
            const id = workHour?.id || day; // Use day as a fallback ID for new entries

            return (
              <div key={id} className="flex items-center space-x-4 p-2 border rounded-md">
                <Label className="w-24 capitalize">{day}</Label>
                <Switch
                  checked={workHour?.enabled ?? false}
                  onCheckedChange={(checked) => handleToggleEnabled(id, checked)}
                />
                <Input
                  type="time"
                  value={workHour?.start_time || '09:00'}
                  onChange={(e) => handleTimeChange(id, 'start_time', e.target.value)}
                  disabled={!workHour?.enabled}
                  className="w-auto"
                />
                <span>-</span>
                <Input
                  type="time"
                  value={workHour?.end_time || '17:00'}
                  onChange={(e) => handleTimeChange(id, 'end_time', e.target.value)}
                  disabled={!workHour?.enabled}
                  className="w-auto"
                />
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkHoursSettings;