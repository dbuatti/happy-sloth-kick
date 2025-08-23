import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, TaskSection, NewTaskData, CommandPaletteProps } from '@/types';
import { Plus, LayoutDashboard, Calendar, ListTodo, Brain, Moon, Link, Users, Archive, Settings, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import AddTaskForm from './AddTaskForm';
import { format, startOfDay } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'react-hot-toast';

const CommandPalette: React.FC<CommandPaletteProps> = ({ isCommandPaletteOpen, setIsCommandPaletteOpen, currentDate, setCurrentDate }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();

  const {
    tasks,
    categories,
    sections,
    addTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: user?.id });

  const [search, setSearch] = useState('');
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setIsCommandPaletteOpen(false);
  }, [navigate, setIsCommandPaletteOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully!');
      setIsCommandPaletteOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out.');
    }
  };

  const handleNewTaskSubmit = async (data: NewTaskData) => {
    try {
      await addTask(data);
      toast.success('Task added successfully!');
      setIsAddTaskDialogOpen(false);
      setIsCommandPaletteOpen(false);
    } catch (error) {
      toast.error('Failed to add task.');
      console.error(error);
    }
  };

  const menuItems = useMemo(() => [
    { heading: 'Navigation', items: [
      { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, onSelect: () => handleSelect('/') },
      { value: 'daily-tasks', label: 'Daily Tasks', icon: ListTodo, onSelect: () => handleSelect('/daily-tasks') },
      { value: 'task-calendar', label: 'Task Calendar', icon: Calendar, onSelect: () => handleSelect('/task-calendar') },
      { value: 'time-block-schedule', label: 'Time Block Schedule', icon: Calendar, onSelect: () => handleSelect('/time-block-schedule') },
      { value: 'focus-mode', label: 'Focus Mode', icon: Brain, onSelect: () => handleSelect('/focus-mode') },
      { value: 'sleep-tracker', label: 'Sleep Tracker', icon: Moon, onSelect: () => handleSelect('/sleep-tracker') },
      { value: 'dev-space', label: 'Dev Space', icon: Link, onSelect: () => handleSelect('/dev-space') },
      { value: 'people-memory', label: 'People Memory', icon: Users, onSelect: () => handleSelect('/people-memory') },
      { value: 'archive', label: 'Archive', icon: Archive, onSelect: () => handleSelect('/archive') },
      { value: 'settings', label: 'Settings', icon: Settings, onSelect: () => handleSelect('/settings') },
    ]},
    { heading: 'Actions', items: [
      { value: 'add-task', label: 'Add New Task', icon: Plus, onSelect: () => setIsAddTaskDialogOpen(true) },
      { value: 'sign-out', label: 'Sign Out', icon: LogOut, onSelect: handleSignOut },
    ]},
  ], [handleSelect, handleSignOut]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setIsCommandPaletteOpen]);

  return (
    <>
      <Dialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <DialogContent className="p-0 max-w-lg">
          <Command>
            <CommandInput placeholder="Type a command or search..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {menuItems.map((group) => (
                <CommandGroup key={group.heading} heading={group.heading}>
                  {group.items
                    .filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
                    .map((item) => (
                      <CommandItem key={item.value} value={item.value} onSelect={item.onSelect}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Sheet open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <AddTaskForm
              onAddTask={handleNewTaskSubmit}
              onTaskAdded={() => setIsAddTaskDialogOpen(false)}
              categories={categories || []}
              sections={sections || []}
              currentDate={currentDate}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode.mutateAsync}
              showCompleted={settings?.visible_pages?.show_completed_tasks ?? false}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CommandPalette;