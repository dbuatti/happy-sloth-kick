import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, User, BellRing, LayoutDashboard, ListTodo, CalendarDays, Moon, Code, UtensilsCrossed, Sparkles } from 'lucide-react';
import WorkHoursSettings from '@/components/WorkHoursSettings';
import ProjectTrackerSettings from '@/components/ProjectTrackerSettings';
import TaskSettings from '@/components/TaskSettings';
import ScheduleSettings from '@/components/ScheduleSettings';
import PageToggleSettings from '@/components/PageToggleSettings';

interface SettingsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Settings: React.FC<SettingsProps> = ({ isDemo = false, demoUserId }) => {
  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="h-7 w-7 text-primary" /> Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PageToggleSettings />
        <WorkHoursSettings />
        <ProjectTrackerSettings />
        <TaskSettings />
        <ScheduleSettings />
        {/* Add other settings components here as needed */}
      </div>
    </main>
  );
};

export default Settings;