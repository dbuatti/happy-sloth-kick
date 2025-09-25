import React, { useState } from 'react';
import DailyScheduleView from '@/components/DailyScheduleView';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks'; // Added missing import

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());

  // This is needed to ensure the useTasks hook is initialized and provides necessary context
  // for components like ScheduleGridContent, even if its direct return values aren't used here.
  // The filters are not directly used in TimeBlockSchedule, but the hook needs them.
  const {
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId: demoUserId ?? user?.id, viewMode: 'daily' }); // Pass userId correctly

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <DailyScheduleView
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        isDemo={isDemo}
        demoUserId={demoUserId}
        onOpenTaskOverview={() => {}} // Placeholder, as this view doesn't directly open task overview
      />
    </div>
  );
};

export default TimeBlockSchedule;