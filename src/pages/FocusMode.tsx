import React, { useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import { useLocation } from 'react-router-dom';

const FocusMode: React.FC = () => {
  const location = useLocation();
  const initialDuration = location.state?.duration;

  const {
    filteredTasks,
    updateTask,
    sections,
    allCategories,
    tasks,
    nextAvailableTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    handleAddTask,
    currentDate,
  } = useTasks({ viewMode: 'focus' });

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleOpenDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <FocusToolsPanel
            nextAvailableTask={nextAvailableTask}
            tasks={tasks}
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onOpenDetail={handleOpenDetail}
            onDeleteTask={() => { /* Delete not typically in focus mode */ }}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            handleAddTask={handleAddTask}
            initialDuration={initialDuration}
          />
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={() => { /* Delete not typically in focus mode */ }}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        />
      )}
    </div>
  );
};

export default FocusMode;