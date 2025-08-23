import React, { useState, useCallback, useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { Task, TaskCategory, TaskSection } from '@/types';
import { Plus, LayoutDashboard, Calendar, ListTodo, Brain, Moon, Link, Users, Archive, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddTaskForm from './AddTaskForm';
import { format, startOfDay } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, setOpen }) => {
  const navigate = useNavigate();
  const { userId, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const {
    tasks,
    sections,
    categories: allCategories,
    addTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: userId! });

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

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

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    callback();
  }, [setOpen]);

  const handleNewTaskSubmit = async (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => {
    await addTask(description, sectionId, parentTaskId, dueDate, categoryId, priority);
    setIsAddTaskDialogOpen(false);
    setOpen(false);
  };

  const pages = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Tasks', path: '/tasks', icon: ListTodo },
    { name: 'Schedule', path: '/schedule', icon: Calendar },
    { name: 'Focus Mode', path: '/focus-mode', icon: Brain },
    { name: 'Sleep Tracker', path: '/sleep-tracker', icon: Moon },
    { name: 'Quick Links', path: '/quick-links', icon: Link },
    { name: 'People Memory', path: '/people-memory', icon: Users },
    { name: 'Archive', path: '/archive', icon: Archive },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {pages.map(page => (
              <CommandItem key={page.path} onSelect={() => handleSelect(() => navigate(page.path))}>
                <page.icon className="mr-2 h-4 w-4" />
                {page.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Tasks">
            <CommandItem onSelect={() => handleSelect(() => setIsAddTaskDialogOpen(true))}>
              <Plus className="mr-2 h-4 w-4" /> Add New Task
            </CommandItem>
            {(sections as TaskSection[]).length > 0 && (
              <CommandGroup heading="Sections">
                {(sections as TaskSection[]).map(section => (
                  <CommandItem key={section.id} onSelect={() => handleSelect(() => {
                    // Logic to navigate to section or filter tasks by section
                    navigate(`/tasks?section=${section.id}`);
                  })}>
                    <ListTodo className="mr-2 h-4 w-4" /> {section.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => handleSelect(() => {
              updateSettings({ schedule_show_focus_tasks_only: !settings?.schedule_show_focus_tasks_only });
              toast.success(`Schedule now ${settings?.schedule_show_focus_tasks_only ? 'showing all tasks' : 'only showing focus tasks'}`);
            })}>
              <Calendar className="mr-2 h-4 w-4" /> Toggle Schedule Focus Tasks Only ({settings?.schedule_show_focus_tasks_only ? 'On' : 'Off'})
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem onSelect={() => handleSelect(signOut)}>
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Add Task Dialog/Sheet */}
      <Sheet open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <AddTaskForm
            onAddTask={handleNewTaskSubmit}
            onTaskAdded={() => setIsAddTaskDialogOpen(false)}
            sections={sections as TaskSection[]}
            allCategories={allCategories as TaskCategory[]}
            currentDate={currentDate}
            createSection={createSection.mutateAsync}
            updateSection={updateSection.mutateAsync}
            deleteSection={deleteSection.mutateAsync}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CommandPalette;