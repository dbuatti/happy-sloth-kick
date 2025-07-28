import React, { useState, useCallback, useEffect } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, Command } from "@/components/ui/command";
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, BarChart3, Home, FolderOpen, ChevronLeft, ChevronRight, LogOut, LayoutGrid, CalendarClock, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddTaskForm from './AddTaskForm';
import { useSound } from '@/context/SoundContext';

interface CommandPaletteProps {
  isAddTaskOpen: boolean;
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date; // New prop
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>; // New prop
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isAddTaskOpen, setIsAddTaskOpen, currentDate, setCurrentDate }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleAddTask, sections } = useTasks({ currentDate, setCurrentDate }); // Pass currentDate and setCurrentDate
  const isMobile = useIsMobile();
  const { playSound } = useSound();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prevOpen) => {
          const newOpen = !prevOpen;
          if (newOpen) playSound();
          return newOpen;
        });
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [playSound]);

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    playSound();
    callback();
  }, [playSound]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess('Signed out successfully!');
      navigate('/');
    } catch (error: any) {
      showError(error.message);
      console.error('Error signing out:', error);
    }
  };

  const handleNewTaskSubmit = async (taskData: any) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsAddTaskOpen(false);
      playSound();
    }
    return success;
  };

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen);
          if (newOpen) playSound();
        }}>
          <SheetContent className="h-full">
            <SheetHeader>
              <SheetTitle>Command Palette</SheetTitle>
            </SheetHeader>
            <Command>
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Actions">
                  <CommandItem onSelect={() => handleSelect(() => setIsAddTaskOpen(true))}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Add New Task</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/'))}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Go to Daily Tasks</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => setCurrentDate(new Date()))}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <span>Go to Today</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/projects'))}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>Go to Project Balance</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/schedule'))}>
                    <CalendarClock className="mr-2 h-4 w-4" />
                    <span>Go to Time Blocks</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/analytics'))}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Go to Analytics</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => navigate('/settings'))}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Go to Settings</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1))))}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    <span>Previous Day</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1))))}>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    <span>Next Day</span>
                  </CommandItem>
                </CommandGroup>

                {user && (
                  <CommandGroup heading="Account">
                    <CommandItem onSelect={() => handleSelect(handleSignOut)}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {sections.length > 0 && (
                  <CommandGroup heading="Sections">
                    {sections.map(section => (
                      <CommandItem key={section.id} onSelect={() => handleSelect(() => {
                        console.log(`Selected section: ${section.name}`);
                        navigate('/');
                      })}>
                        <FolderOpen className="mr-2 h-4 w-4" />
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
        <CommandDialog open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen);
          if (newOpen) playSound();
        }}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleSelect(() => setIsAddTaskOpen(true))}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Add New Task</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/'))}>
                <Home className="mr-2 h-4 w-4" />
                <span>Go to Daily Tasks</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => setCurrentDate(new Date()))}>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Go to Today</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/projects'))}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>Go to Project Balance</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/schedule'))}>
                <CalendarClock className="mr-2 h-4 w-4" />
                <span>Go to Time Blocks</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/analytics'))}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Go to Analytics</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => navigate('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Go to Settings</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1))))}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                <span>Previous Day</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1))))}>
                <ChevronRight className="mr-2 h-4 w-4" />
                <span>Next Day</span>
              </CommandItem>
            </CommandGroup>

            {user && (
              <CommandGroup heading="Account">
                <CommandItem onSelect={() => handleSelect(handleSignOut)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </CommandItem>
              </CommandGroup>
            )}

            {sections.length > 0 && (
                  <CommandGroup heading="Sections">
                    {sections.map(section => (
                      <CommandItem key={section.id} onSelect={() => handleSelect(() => {
                        console.log(`Selected section: ${section.name}`);
                        navigate('/');
                      })}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        <span>Go to {section.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
          </CommandList>
        </CommandDialog>
      )}

      {isMobile ? (
        <Sheet open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <SheetContent className="h-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add New Task</SheetTitle>
            </SheetHeader>
            <AddTaskForm onAddTask={handleNewTaskSubmit} userId={user?.id || null} onTaskAdded={() => setIsAddTaskOpen(false)} sections={sections} />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <AddTaskForm onAddTask={handleNewTaskSubmit} userId={user?.id || null} onTaskAdded={() => setIsAddTaskOpen(false)} sections={sections} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CommandPalette;