import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, EyeOff } from 'lucide-react';

const TaskSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  const handleToggleHideFutureTasks = (checked: boolean) => {
    updateSettings({ hide_future_tasks: checked });
  };

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
          <Label htmlFor="hide-future-tasks-toggle" className="text-base font-medium flex items-center gap-2">
            {settings?.hide_future_tasks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Hide Future-Dated Tasks
          </Label>
          <Switch
            id="hide-future-tasks-toggle"
            checked={settings?.hide_future_tasks || false}
            onCheckedChange={handleToggleHideFutureTasks}
            aria-label="Toggle hiding future-dated tasks"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          When enabled, tasks with a due date in the future will not appear in your daily list.
        </p>
      </CardContent>
    </Card>
  );
};

export default TaskSettings;