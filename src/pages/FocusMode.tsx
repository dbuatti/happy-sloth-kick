import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Task, useTasks, UpdateTaskData, NewTaskSectionData, UpdateTaskSectionData, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks'; // Removed unused Category types
import FocusToolsPanel from '@/components/FocusToolsPanel';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useSettings } from '@/context/SettingsContext';
import { useDoToday } from '@/hooks/useDoToday'; // Import useDoToday

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  useSettings(); // Ensure settings are loaded

  const {
    tasks, // All tasks (real and generated recurring)
    isLoading,
    updateTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTasks({ userId: demoUserId, currentDate: new Date() });

  const { doTodayOffIds, updateDailyProgress } = useDoToday({ userId: demoUserId, currentDate: new Date() }); // Removed unused toggleDoToday, dailyProgress

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const tasksInFocusMode = useMemo(() => {
    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
    return tasks.filter(task =>
      task.status === 'to-do' &&
      (task.section_id === null || focusModeSectionIds.has(task.section_id || '')) && // Handle potential undefined section_id
      !doTodayOffIds.includes(task.id) // Exclude tasks moved off "Do Today"
    ).sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order
  }, [tasks, sections, doTodayOffIds]);

  const nextAvailableTask = useMemo(() => {
    return tasksInFocusMode.length > 0 ? tasksInFocusMode[0] : null;
  }, [tasksInFocusMode]);

  const handleOpenDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  // Update daily progress whenever tasksInFocusMode changes
  React.useEffect(() => {
    updateDailyProgress(tasksInFocusMode);
  }, [tasksInFocusMode, updateDailyProgress]);

  return (
    <div className="flex-1 flex flex-col p-4">
      <main className="flex-grow">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center">Focus Mode</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 h-full flex flex-col">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <FocusToolsPanel
                nextAvailableTask={nextAvailableTask}
                tasksInFocusMode={tasksInFocusMode}
                updateTask={updateTask}
                onOpenDetail={handleOpenDetail}
                sections={sections}
              />
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={async () => { /* Delete not typically in focus mode */ return false; }} // Explicitly return boolean
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          allTasks={tasks} // Cast to Task[]
        />
      )}
    </div>
  );
};

export default FocusMode;