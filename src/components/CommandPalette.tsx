import React, { useState, useEffect, useCallback } from 'react';
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
import { Plus, Search, LayoutDashboard, Calendar, ListTodo, Archive, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import AddTaskForm from './AddTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Task } from '@/types/task';

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut: authSignOut } = useAuth();
  const userId = user?.id;
  const isDemo = user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const {
    sections,
    allCategories,
    handleAddTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    currentDate,
  } = useTasks({ userId: userId, currentDate: new Date() });

  const isMobile = useIsMobile();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavigation = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  const handleNewTaskSubmit = async (taskData: Partial<Task>) => {
    const newTask = await handleAddTask(taskData);
    if (newTask) {
      setIsAddTaskDialogOpen(false);
      setOpen(false);
    }
    return newTask;
  };

  const renderAddTaskForm = () => (
    <AddTaskForm
      onAddTask={handleNewTaskSubmit}
      onTaskAdded={() => setIsAddTaskDialogOpen(false)}
      sections={sections}
      allCategories={allCategories}
      currentDate={currentDate}
      createSection={createSection}
      updateSection={updateSection}
      deleteSection={deleteSection}
      updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      createCategory={createCategory}
      updateCategory={updateCategory}
      deleteCategory={deleteCategory}
    />
  );

  return (
    <>
      <Button
        variant="outline"
        className="flex items-center justify-between w-full md:w-48 lg:w-64 text-sm text-muted-foreground px-3 py-2 rounded-md shadow-sm"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        Search...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => setIsAddTaskDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Add New Task</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation(isDemo ? '/demo/dashboard' : '/dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation(isDemo ? '/demo/my-hub' : '/my-hub')}>
              <ListTodo className="mr-2 h-4 w-4" />
              <span>My Hub</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation(isDemo ? '/demo/calendar' : '/calendar')}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation(isDemo ? '/demo/archive' : '/archive')}>
              <Archive className="mr-2 h-4 w-4" />
              <span>Archive</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => handleNavigation('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
            <CommandItem onSelect={() => handleNavigation('/help')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help</span>
            </CommandItem>
            {user && (
              <CommandItem onSelect={() => authSignOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {isMobile ? (
        <Sheet open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <SheetContent side="bottom" className="h-3/4">
            <SheetHeader>
              <SheetTitle>Add New Task</SheetTitle>
            </SheetHeader>
            {renderAddTaskForm()}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            {renderAddTaskForm()}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CommandPalette;