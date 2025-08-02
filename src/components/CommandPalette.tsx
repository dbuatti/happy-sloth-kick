import React, { useState, useCallback, useEffect } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, Command } from "@/components/ui/command";
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, BarChart3, Home, FolderOpen, ChevronLeft, ChevronRight, LogOut, LayoutGrid, CalendarClock, CalendarDays, Target, Archive as ArchiveIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from "@/utils/toast";
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AddTaskForm from './AddTaskForm';
import { useSound } from '@/context/SoundContext';

interface CommandPaletteProps {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isCommandPaletteOpen, setIsCommandPaletteOpen, currentDate, setCurrentDate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleAddTask, sections, allCategories } = useTasks({ currentDate }); // Removed setCurrentDate from props
  const isMobile = useIsMobile();
  const { playSound } = useSound();

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prevOpen) => !prevOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setIsCommandPaletteOpen]);

  const handleSelect = useCallback((callback: () => void) => {
    setIsCommandPaletteOpen(false);
    playSound('success');
    callback();
  }, [playSound, setIsCommandPaletteOpen]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess('Signed out successfully!');
      navigate('/');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleNewTaskSubmit = async (taskData: any) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsAddTaskDialogOpen(false);
      playSound('success');
    }
    return success;
  };

  return (
    <>
      {isMobile ? (
        <Sheet open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
          <SheetContent className="h-full">
            <SheetHeader>
              <SheetTitle>Command Palette</SheetTitle>
            </SheetHeader>
            <Command>
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Actions">
                  <CommandItem onSelect={() => handleSelect(() => setIsAddTaskDialogOpen(true))}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    <span>Add New Task</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/'))}>
                    <Home className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Daily Tasks</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => setCurrentDate(new Date()))}>
                    <CalendarDays className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Today</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/focus'))}>
                    <Target className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Focus Mode</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/projects'))}>
                    <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Project Balance</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/schedule'))}>
                    <CalendarClock className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Time Blocks</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/analytics'))}>
                    <BarChart3 className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Analytics</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/archive'))}>
                    <ArchiveIcon className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Archive</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/settings'))}>
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    <span>Go to Settings</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1))))}>
                    <ChevronLeft className="mr-2 h-3.5 w-3.5" />
                    <span>Previous Day</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1))))}>
                    <ChevronRight className="mr-2 h-3.5 w-3.5" />
                    <span>Next Day</span>
                  </CommandItem>
                </CommandGroup>

                {user && (
                  <CommandGroup heading="Account">
                    <CommandItem onSelect={() => handleSelect(handleSignOut)}>
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {sections.length > 0 && (
                  <CommandGroup heading="Sections">
                    {sections.map(section => (
                      <CommandItem key={section.id} onSelect={() => handleSelect(() => {
                        navigate('/');
                      })}>
                        <FolderOpen className="mr-2 h-3.5 w-3.5" />
                        <span>Go to {section.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </SheetContent>
        </Sheet>
      ) : (
        <CommandDialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleSelect(() => setIsAddTaskDialogOpen(true))}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                <span>Add New Task</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/'))}>
                <Home className="mr-2 h-3.5 w-3.5" />
                <span>Go to Daily Tasks</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => setCurrentDate(new Date()))}>
                <CalendarDays className="mr-2 h-3.5 w-3.5" />
                <span>Go to Today</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/focus'))}>
                <Target className="mr-2 h-3.5 w-3.5" />
                <span>Go to Focus Mode</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/projects'))}>
                <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                <span>Go to Project Balance</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/schedule'))}>
                <CalendarClock className="mr-2 h-3.5 w-3.5" />
                <span>Go to Time Blocks</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/analytics'))}>
                <BarChart3 className="mr-2 h-3.5 w-3.5" />
                <span>Go to Analytics</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/archive'))}>
                <ArchiveIcon className="mr-2 h-3.5 w-3.5" />
                <span>Go to Archive</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/settings'))}>
                <Settings className="mr-2 h-3.5 w-3.5" />
                <span>Go to Settings</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1))))}>
                <ChevronLeft className="mr-2 h-3.5 w-3.5" />
                <span>Previous Day</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1))))}>
                <ChevronRight className="mr-2 h-3.5 w-3.5" />
                <span>Next Day</span>
              </CommandItem>
            </CommandGroup>

            {user && (
              <CommandGroup heading="Account">
                <CommandItem onSelect={() => handleSelect(handleSignOut)}>
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </CommandItem>
              </CommandGroup>
            )}

            {sections.length > 0 && (
                  <CommandGroup heading="Sections">
                    {sections.map(section => (
                      <CommandItem key={section.id} onSelect={() => handleSelect(() => {
                        navigate('/');
                      })}>
                        <FolderOpen className="mr-2 h-3.5 w-3.5" />
                        <span>Go to {section.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
          </CommandList>
        </CommandDialog>
      )}

      {isMobile ? (
        <Sheet open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <SheetContent className="h-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add New Task</SheetTitle>
              <DialogDescription className="sr-only">
                Fill in the details to add a new task from the command palette.
              </DialogDescription>
            </SheetHeader>
            <AddTaskForm onAddTask={handleNewTaskSubmit} onTaskAdded={() => setIsAddTaskDialogOpen(false)} sections={sections} allCategories={allCategories} currentDate={currentDate} />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription className="sr-only">
                Fill in the details to add a new task from the command palette.
              </DialogDescription>
            </DialogHeader>
            <AddTaskForm onAddTask={handleNewTaskSubmit} onTaskAdded={() => setIsAddTaskDialogOpen(false)} sections={sections} allCategories={allCategories} currentDate={currentDate} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CommandPalette;