import React, { useState, useCallback } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Target, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePomodoro } from '@/context/PomodoroContext';
import PomodoroTimer from './PomodoroTimer';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import ConfirmationDialog from './ConfirmationDialog';

interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
  filteredTasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<boolean | undefined>;
  sections: TaskSection[];
  allCategories: Category[];
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  currentDate: Date;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
  markAllTasksAsSkipped?: () => Promise<void>;
  loading: boolean;
  // Removed unused createCategory, updateCategory, deleteCategory
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onClose,
  allTasks,
  filteredTasks,
  updateTask,
  onOpenDetail,
  onDeleteTask,
  sections,
  allCategories,
  handleAddTask,
  currentDate,
  setFocusTask,
  doTodayOffIds,
  toggleDoToday,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  markAllTasksAsSkipped,
  loading,
}) => {
  const {
    startTimer,
    resetTimer,
    focusedTaskDescription,
  } = usePomodoro();

  const [taskSearch, setTaskSearch] = useState('');
  const [isConfirmClearFocusOpen, setIsConfirmClearFocusOpen] = useState(false);

  const focusedTask = allTasks.find(t => t.description === focusedTaskDescription);

  const availableTasksForFocus = filteredTasks.filter(task =>
    task.parent_task_id === null &&
    task.status === 'to-do' &&
    (task.description?.toLowerCase().includes(taskSearch.toLowerCase()) || taskSearch === '')
  );

  const handleSetFocusTask = useCallback(async (task: Task) => {
    await setFocusTask(task.id);
    startTimer(task.description);
    showSuccess(`Focus set to: ${task.description}`);
  }, [setFocusTask, startTimer]);

  const handleClearFocus = useCallback(async () => {
    await setFocusTask(null);
    resetTimer();
    setTaskSearch('');
    showSuccess('Focus cleared.');
    setIsConfirmClearFocusOpen(false);
  }, [setFocusTask, resetTimer]);

  const handleAddTaskToFocus = useCallback(async () => {
    if (!taskSearch.trim()) {
      showError('Task description cannot be empty.');
      return;
    }
    const newTask: NewTaskData = {
      description: taskSearch.trim(),
      category: allCategories[0]?.id || null,
      section_id: sections.find(s => s.name.toLowerCase() === 'priorities')?.id || null,
    };
    const newTaskId = await handleAddTask(newTask);
    if (newTaskId) {
      const createdTask = allTasks.find(t => t.id === newTaskId);
      if (createdTask) {
        handleSetFocusTask(createdTask);
      }
      setTaskSearch('');
    }
  }, [taskSearch, allCategories, sections, handleAddTask, allTasks, handleSetFocusTask]);

  const isDoToday = useCallback((task: Task) => !doTodayOffIds.has(task.original_task_id || task.id), [doTodayOffIds]);

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="w-[min(90vw,500px)] mt-0 h-full rounded-none">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Focus Mode
          </DrawerTitle>
          <DrawerDescription>
            Concentrate on your most important tasks without distractions.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-6">
            <PomodoroTimer />

            <Separator />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Focus</h3>
              {focusedTaskDescription && (
                <Button variant="outline" size="sm" onClick={() => setIsConfirmClearFocusOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" /> Clear Focus
                </Button>
              )}
            </div>

            {focusedTask ? (
              <div className="border rounded-lg bg-card shadow-sm">
                <TaskItem
                  task={focusedTask}
                  allTasks={allTasks}
                  onDelete={onDeleteTask}
                  onUpdate={updateTask}
                  sections={sections}
                  onOpenOverview={onOpenDetail}
                  currentDate={currentDate}
                  level={0}
                  isDoToday={isDoToday(focusedTask)}
                  toggleDoToday={toggleDoToday}
                  setFocusTask={setFocusTask}
                  isDemo={false}
                  isSelected={false}
                  onSelectTask={() => {}}
                  onAddSubtask={() => {}}
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <p>No task currently in focus.</p>
                <p className="text-sm">Select a task below or add a new one.</p>
              </div>
            )}

            <Separator />

            <h3 className="text-lg font-semibold">Available Tasks</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Search or add task to focus..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTaskToFocus()}
                className="flex-1"
              />
              <Button onClick={handleAddTaskToFocus} disabled={!taskSearch.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading tasks...</div>
            ) : availableTasksForFocus.length > 0 ? (
              <div className="space-y-2">
                {availableTasksForFocus.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer",
                      focusedTask?.id === task.id && "bg-primary/10 border-primary"
                    )}
                    onClick={() => handleSetFocusTask(task)}
                  >
                    <span className="font-medium">{task.description}</span>
                    <Button variant="ghost" size="sm">
                      <Target className="h-4 w-4 mr-2" /> Set Focus
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No tasks found matching your search.</p>
            )}

            <Separator />

            <div className="flex flex-col gap-2 mt-4">
              <Button variant="outline" onClick={archiveAllCompletedTasks}>Archive All Completed</Button>
              <Button variant="outline" onClick={toggleAllDoToday}>Toggle All Do Today</Button>
              {markAllTasksAsSkipped && (
                <Button variant="outline" onClick={markAllTasksAsSkipped}>Mark All Skipped</Button>
              )}
            </div>
          </div>
        </ScrollArea>

        <ConfirmationDialog
          isOpen={isConfirmClearFocusOpen}
          onClose={() => setIsConfirmClearFocusOpen(false)}
          onConfirm={handleClearFocus}
          title="Clear Focused Task?"
          description="Are you sure you want to clear the current focused task and reset the Pomodoro timer?"
          confirmText="Clear Focus"
          confirmVariant="destructive"
        />
      </DrawerContent>
    </Drawer>
  );
};

export default FocusPanelDrawer;