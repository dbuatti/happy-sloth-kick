import React from 'react';
import { useSettingsContext } from '@/context/SettingsContext'; // Corrected import
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Goal, CalendarDays, Moon, Target, Code, BarChart2, Archive, Utensils } from 'lucide-react';

const PageToggleSettings: React.FC = () => {
  const { settings, isLoading, updateSettings } = useSettingsContext(); // Corrected destructuring and hook

  const visiblePages = settings?.visible_pages || {
    dailyTasks: true,
    projects: true,
    schedule: true,
    sleep: true,
    focus: true,
    devSpace: true,
    analytics: true,
    archive: true,
    mealPlanner: true,
    resonanceGoals: true,
  };

  const handleTogglePageVisibility = async (page: keyof typeof visiblePages) => {
    await updateSettings({
      visible_pages: {
        ...visiblePages,
        [page]: !visiblePages[page],
      },
    });
  };

  const pageOptions = [
    { id: 'dailyTasks', label: 'Daily Tasks', icon: <ListTodo className="h-4 w-4" /> },
    { id: 'projects', label: 'Projects', icon: <Goal className="h-4 w-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'sleep', label: 'Sleep Tracker', icon: <Moon className="h-4 w-4" /> },
    { id: 'focus', label: 'Focus Mode', icon: <Target className="h-4 w-4" /> },
    { id: 'devSpace', label: 'Dev Space', icon: <Code className="h-4 w-4" /> },
    { id: 'mealPlanner', label: 'Meal Planner', icon: <Utensils className="h-4 w-4" /> },
    { id: 'resonanceGoals', label: 'Resonance Goals', icon: <Goal className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="h-4 w-4" /> },
    { id: 'archive', label: 'Archive', icon: <Archive className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Page Visibility</CardTitle></CardHeader>
        <CardContent className="text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pageOptions.map((page) => (
          <div key={page.id} className="flex items-center justify-between">
            <Label htmlFor={`toggle-${page.id}`} className="flex items-center gap-2">
              {page.icon} {page.label}
            </Label>
            <Switch
              id={`toggle-${page.id}`}
              checked={visiblePages[page.id as keyof typeof visiblePages]}
              onCheckedChange={() => handleTogglePageVisibility(page.id as keyof typeof visiblePages)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PageToggleSettings;