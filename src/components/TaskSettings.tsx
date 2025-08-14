import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TaskSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  const handleVisibilityChange = (value: string) => {
    updateSettings({ future_tasks_days_visible: parseInt(value, 10) });
  };

  const visibilityOptions = [
    { value: '0', label: 'Today Only' },
    { value: '3', label: 'Next 3 Days' },
    { value: '7', label: 'Next 7 Days' },
    { value: '30', label: 'Next 30 Days' },
    { value: '-1', label: 'All Future Tasks' },
  ];

  const currentValue = settings?.future_tasks_days_visible?.toString() ?? '7';
  const currentLabel = visibilityOptions.find(opt => opt.value === currentValue)?.label || 'Next 7 Days';

  if (loading) {
    return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> Task View Options
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Eye className="h-6 w-6 text-primary" /> Task View Options
        </CardTitle>
        <p className="text-sm text-muted-foreground">Customize how tasks are displayed in your daily view.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Label htmlFor="future-tasks-visibility" className="text-base font-medium flex items-center gap-2">
            Show Future Tasks For
          </Label>
          <Select value={currentValue} onValueChange={handleVisibilityChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              {visibilityOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Currently showing tasks for: {currentLabel}.
        </p>
      </CardContent>
    </Card>
  );
};

export default TaskSettings;