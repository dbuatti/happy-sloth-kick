import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings, UserSettings } from '@/context/SettingsContext'; // Import UserSettings

interface TaskSettingsProps {
  settings: UserSettings | null;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>;
}

const visibilityOptions = [
  { value: '0', label: 'Today Only' },
  { value: '1', label: 'Next 1 Day' },
  { value: '3', label: 'Next 3 Days' },
  { value: '7', label: 'Next 7 Days' },
  { value: '14', label: 'Next 14 Days' },
  { value: '30', label: 'Next 30 Days' },
  { value: 'null', label: 'All Future Tasks' }, // Use 'null' string to represent null
];

const TaskSettings: React.FC<TaskSettingsProps> = ({ settings, updateSettings }) => {
  const handleVisibilityChange = (value: string) => {
    const parsedValue = value === 'null' ? null : parseInt(value, 10);
    updateSettings({ show_future_tasks_for_days: parsedValue }); // Corrected property name
  };

  const currentValue = settings?.show_future_tasks_for_days?.toString() ?? '7'; // Corrected property name
  const currentLabel = visibilityOptions.find(opt => opt.value === currentValue)?.label || 'Next 7 Days';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Task View Options</h3>
      <p className="text-sm text-muted-foreground">Customize how tasks are displayed in your daily view.</p>

      <div className="grid gap-2">
        <Label htmlFor="future-tasks-visibility">Show Future Tasks For</Label>
        <Select value={currentValue} onValueChange={handleVisibilityChange}>
          <SelectTrigger id="future-tasks-visibility" className="w-[180px]">
            <SelectValue placeholder={currentLabel} />
          </SelectTrigger>
          <SelectContent>
            {visibilityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">Currently showing tasks for: {currentLabel}.</p>
      </div>
    </div>
  );
};

export default TaskSettings;