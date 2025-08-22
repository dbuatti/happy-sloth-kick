import React, { useState, useCallback, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { Task, TaskSection, TaskCategory, TaskStatus } from '@/types/task';
import AddTaskForm from './AddTaskForm';
import { AddTaskFormProps } from '@/types/props'; // Ensure this is correctly imported

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'search' | 'addTask'>('search');
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);
  const { user } = useAuth();
  const userId = user?.id;

  const {
    tasks,
    sections,
    allCategories,
    handleAddTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    onStatusChange, // Added from TaskActionProps
  } = useTasks({ userId: userId, currentDate: new Date(), viewMode: 'all' });

  const handleNewTaskSubmit = async (taskData: Partial<Task>) => {
    const newTask = await handleAddTask(taskData);
    if (newTask) {
      setMode('search');
      setOpen(false);
      setPrefilledTaskData(null);
    }
    return newTask;
  };

  const handleOpenAddTask = useCallback(() => {
    setPrefilledTaskData(null);
    setMode('addTask');
  }, []);

  const handleOpenAddTaskWithPrefill = useCallback((data: Partial<Task>) => {
    setPrefilledTaskData(data);
    setMode('addTask');
  }, []);

  const handleTaskSelect = useCallback((task: Task) => {
    // For now, just log and close. In a real app, this might open a task detail dialog.
    console.log('Selected task:', task);
    setOpen(false);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => task.status !== 'completed' && task.status !== 'archived');
  }, [tasks]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        setMode('search'); // Reset to search mode when opening with shortcut
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const addTaskFormProps: AddTaskFormProps = {
    onAddTask: handleNewTaskSubmit,
    onTaskAdded: () => setOpen(false),
    sections: sections,
    allCategories: allCategories,
    currentDate: new Date(),
    createSection: createSection,
    updateSection: updateSection,
    deleteSection: deleteSection,
    updateSectionIncludeInFocusMode: updateSectionIncludeInFocusMode,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    initialData: prefilledTaskData,
    onUpdate: updateTask,
    onDelete: deleteTask,
    onReorderTasks: reorderTasks,
    onStatusChange: onStatusChange,
  };

  return (
    <>
      <Button
        variant="outline"
        className="ml-auto flex items-center gap-2"
        onClick={() => {
          setOpen(true);
          setMode('search');
        }}
      >
        <Search className="h-4 w-4" />
        Search...
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {mode === 'search' ? (
          <>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={handleOpenAddTask}>
                  <Plus className="mr-2 h-4 w-4" /> Add New Task
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Tasks">
                {filteredTasks.map((task) => (
                  <CommandItem key={task.id} onSelect={() => handleTaskSelect(task)}>
                    <ListTodo className="mr-2 h-4 w-4" />
                    <span>{task.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </>
        ) : (
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
            <AddTaskForm {...addTaskFormProps} />
          </div>
        )}
      </CommandDialog>
    </>
  );
};

export default CommandPalette;