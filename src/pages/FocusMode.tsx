import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RefreshCcw, Brain, SkipForward } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks, Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import ActiveTaskPanel from '@/components/ActiveTaskPanel'; // Import ActiveTaskPanel
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const FocusMode: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

  const {
    filteredTasks,
    updateTask,
    sections,
    allCategories,
    tasks, // Pass all tasks for subtask filtering in ActiveTaskPanel
    nextAvailableTask, // Pass next available task
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ viewMode: 'focus' });

  // These states are now managed within ActiveTaskPanel
  // const [focusDuration, setFocusDuration] = useState(25 * 60);
  // const [breakDuration, setBreakDuration] = useState(5 * 60);
  // const [longBreakDuration, setLongBreakDuration] = useState(15 * 60);
  // const [timeRemaining, setTimeRemaining] = useState(focusDuration);
  // const [isRunning, setIsRunning] = useState(false);
  // const [isFocusPhase, setIsFocusPhase] = useState(true);
  // const [sessionsCompleted, setSessionsCompleted] = useState(0);
  // const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Removed all timer and task display logic from here, it's now in ActiveTaskPanel

  const handleOpenDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* The main content of FocusMode is now handled by ActiveTaskPanel */}
          <ActiveTaskPanel
            nextAvailableTask={nextAvailableTask}
            tasks={tasks}
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onOpenDetail={handleOpenDetail}
            onDeleteTask={() => { /* Delete not typically in focus mode */ }}
            sections={sections}
            allCategories={allCategories}
            currentDate={new Date()} // Pass current date if needed for task logic
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