import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Task } from '@/hooks/useTasks';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("daily");

  const {
    processedTasks,
    sections,
    allCategories,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId: demoUserId });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskClick = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
    setIsTaskOverviewOpen(false); // Close overview if opening detail
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Schedule</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
        </TabsList>
        {activeTab === "daily" && (
          <DailyScheduleView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isDemo={isDemo}
            demoUserId={demoUserId}
            onOpenTaskOverview={handleOpenTaskOverview}
          />
        )}
        {activeTab === "weekly" && (
          <WeeklyScheduleView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isDemo={isDemo}
            demoUserId={demoUserId}
            onOpenTaskOverview={handleOpenTaskOverview}
          />
        )}
      </Tabs>

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskClick}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allTasks={processedTasks}
      />

      <TaskDetailDialog
        task={taskToEdit}
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks}
      />
    </div>
  );
};

export default TimeBlockSchedule;