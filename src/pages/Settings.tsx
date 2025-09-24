import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react'; // Removed many unused icons
import WorkHoursSettings from '@/components/WorkHoursSettings';
import ProjectTrackerSettings from '@/components/ProjectTrackerSettings';
import TaskSettings from '@/components/TaskSettings';
import ScheduleSettings from '@/components/ScheduleSettings';
import PageToggleSettings from '@/components/PageToggleSettings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; // Added Card imports

interface SettingsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Settings: React.FC<SettingsProps> = ({ isDemo = false, demoUserId }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <SettingsIcon className="inline-block h-10 w-10 mr-3 text-primary" /> Settings
        </h1>

        <Card className="w-full shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" /> General Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage your application preferences.</p>
          </CardHeader>
          <CardContent className="pt-0">
            {/* General settings content can go here if any */}
            <p className="text-sm text-muted-foreground">No general settings yet.</p>
          </CardContent>
        </Card>

        <PageToggleSettings />
        <WorkHoursSettings />
        <ProjectTrackerSettings />
        <TaskSettings />
        <ScheduleSettings />
      </div>
    </div>
  );
};

export default Settings;