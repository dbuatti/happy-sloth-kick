import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useWorkHours } from '@/hooks/useWorkHours';
import { WorkHour } from '@/types';
import GeneralSettings from '@/components/GeneralSettings';
import TaskSettings from '@/components/TaskSettings';
import ScheduleSettings from '@/components/ScheduleSettings';
import WorkHoursSettings from '@/components/WorkHoursSettings';
import ProjectTrackerSettings from '@/components/ProjectTrackerSettings';
import PageToggleSettings from '@/components/PageToggleSettings';

interface SettingsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Settings: React.FC<SettingsProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings, isLoading: settingsLoading, error: settingsError, updateSettings } = useSettings();
  const { workHours, isLoading: workHoursLoading, error: workHoursError, addWorkHour, updateWorkHour, deleteWorkHour } = useWorkHours({ userId: currentUserId });

  const [isWorkHoursModalOpen, setIsWorkHoursModalOpen] = useState(false);

  const handleSaveWorkHours = async (updatedWorkHours: WorkHour[]) => {
    if (!currentUserId) return;

    for (const updatedHour of updatedWorkHours) {
      const existingHour = workHours.find(wh => wh.id === updatedHour.id);
      if (existingHour) {
        await updateWorkHour({ id: existingHour.id, updates: updatedHour });
      } else if (updatedHour.enabled) {
        await addWorkHour(updatedHour);
      }
    }
    // Also handle deletion if a work hour was disabled and doesn't exist in the new list
    for (const existingHour of workHours) {
      if (!updatedWorkHours.some(uh => uh.id === existingHour.id) && !existingHour.enabled) {
        await deleteWorkHour(existingHour.id);
      }
    }
  };

  if (authLoading || settingsLoading || workHoursLoading) {
    return <div className="p-4 text-center">Loading settings...</div>;
  }

  if (settingsError || workHoursError) {
    return <div className="p-4 text-red-500">Error loading settings: {settingsError?.message || workHoursError?.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <GeneralSettings />
        <TaskSettings />
        <ScheduleSettings />
        <WorkHoursSettings
          isOpen={isWorkHoursModalOpen}
          onClose={() => setIsWorkHoursModalOpen(false)}
          workHours={workHours}
          onSaveWorkHours={handleSaveWorkHours}
        />
        <ProjectTrackerSettings />
        <PageToggleSettings />
      </div>
    </div>
  );
};

export default Settings;