import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, TaskSection, NewTaskData, CommandPaletteProps } from '@/types'; // Added NewTaskData
import { Plus, LayoutDashboard, Calendar, ListTodo, Brain, Moon, Link, Users, Archive, Settings, LogOut, Save } from 'lucide-react'; // Added Save icon
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddTaskForm from './AddTaskForm';
import { format, startOfDay } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { toast } from 'react-hot-toast'; // Ensure toast is imported

const CommandPalette: React.FC<CommandPaletteProps> = ({ isCommandPaletteOpen, setIsCommandPaletteOpen, currentDate, setCurrentDate }) => {
  const navigate = useNavigate();
  const { user, signOut: authSignOut } = useAuth(); // Renamed signOut to authSignOut to avoid conflict
  const { settings, updateSettings } = useSettings();
  const userId = user?.id;

  const {
    tasks,
    categories,
    sections,
    isLoading,
    error,
    addTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: userId! });

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  // const [currentDate, setCurrentDate] = useState(startOfDay(new Date())); // currentDate is now passed as prop

  const setOpen = setIsCommandPaletteOpen; // Alias for clarity

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const handleNewTaskSubmit = async (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => {
    const newTaskData: NewTaskData = {
      description,
      section_id: sectionId,
      parent_task_id: parentTaskId,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      category: categoryId,
      priority: priority as Task['priority'],
      status: 'to-do',
      recurring_type: 'none',
      original_task_id: null,
      link: null,
      image_url: null,
      notes: null,
      remind_at: null,
    };
    await addTask(newTaskData);
    setIsAddTaskDialogOpen(false);
    toast.success('Task added successfully!');
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
      navigate('/auth');
      toast.success('Signed out successfully!');
    } catch (err) {
      toast.error(`Failed to sign out: ${(err as Error).message}`);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: ListTodo, path: '/daily-tasks' },
    { id: 'time-block-schedule', label: 'Time Block Schedule', icon: Calendar, path: '/time-block-schedule' },
    { id: 'focus-mode', label: 'Focus Mode', icon: Brain, path: '/focus-mode' },
    { id: 'sleep-management', label: 'Sleep Management', icon: Moon, path: '/sleep-management' },
    { id: 'dev-space', label: 'Dev Space', icon: Link, path: '/dev-space' },
    { id: 'people-memory', label: 'People Memory', icon: Users, path: '/people-memory' },
    { id: 'archive', label: 'Archive', icon: Archive, path: '/archive' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const demoNavItems = [
    { id: 'dashboard', label: 'Demo Dashboard', icon: LayoutDashboard, path: '/demo/dashboard' },
    { id: 'daily-tasks', label: 'Demo Daily Tasks', icon: ListTodo, path: '/demo/daily-tasks' },
    { id: 'time-block-schedule', label: 'Demo Time Block Schedule', icon: Calendar, path: '/demo/time-block-schedule' },
    { id: 'focus-mode', label: 'Demo Focus Mode', icon: Brain, path: '/demo/focus' },
    { id: 'sleep-management', label: 'Demo Sleep Management', icon: Moon, path: '/demo/sleep-management' },
    { id: 'dev-space', label: 'Demo Dev Space', icon: Link, path: '/demo/dev-space' },
    { id: 'people-memory', label: 'Demo People Memory', icon: Users, path: '/demo/people-memory' },
    { id: 'archive', label: 'Demo Archive', icon: Archive, path: '/demo/archive' },
    { id: 'settings', label: 'Demo Settings', icon: Settings, path: '/demo/settings' },
  ];

  const currentNavItems = userId === 'd889323b-350c-4764-9788-6359f85f6142' ? demoNavItems : navItems;

  return (
    <Sheet open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
      <SheetContent side="top" className="p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Command Palette</SheetTitle>
        </SheetHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {currentNavItems.map((item) => (
                <CommandItem key={item.id} onSelect={() => {
                  navigate(item.path);
                  setOpen(false);
                }}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              <CommandItem onSelect={() => {
                setIsAddTaskDialogOpen(true);
                setOpen(false);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Add New Task</span>
              </CommandItem>
              {settings && (
                <CommandItem onSelect={() => {
                  updateSettings({ schedule_show_focus_tasks_only: !settings?.schedule_show_focus_tasks_only });
                  toast.success(`Schedule now ${settings?.schedule_show_focus_tasks_only ? 'showing all tasks' : 'only showing focus tasks'}`);
                  setOpen(false);
                }}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Toggle Schedule Focus Mode</span>
                </CommandItem>
              )}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem onSelect={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Add Task Dialog */}
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <AddTaskForm
              onAddTask={handleNewTaskSubmit}
              onTaskAdded={() => setIsAddTaskDialogOpen(false)}
              categories={categories as TaskCategory[]}
              sections={sections as TaskSection[]}
              currentDate={currentDate}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              showCompleted={false}
            />
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};

export default CommandPalette;