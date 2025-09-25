import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyScheduleView from "@/components/DailyScheduleView";
import WeeklyScheduleView from "@/components/WeeklyScheduleView";
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { settings: userSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('daily');

  const {
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    processedTasks,
  } = useTasks({ currentDate, userId: demoUserId });

  const handleOpenTaskOverview = (task: any) => {
    // This function is passed to DailyScheduleView and WeeklyScheduleView
    // which then pass it to ScheduleGridContent.
    // ScheduleGridContent then uses it to open the TaskOverviewDialog.
    // For now, we'll just log it or implement a placeholder.
    console.log("Open task overview for:", task);
    // You might want to lift state for a TaskOverviewDialog here or in a parent component
    // if you want a single dialog to manage task details across different views.
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="flex items-center justify-center mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            <DailyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isDemo={isDemo}
              demoUserId={demoUserId}
              onOpenTaskOverview={handleOpenTaskOverview}
            />
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            <WeeklyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isDemo={isDemo}
              demoUserId={demoUserId}
              onOpenTaskOverview={handleOpenTaskOverview}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TimeBlockSchedule;