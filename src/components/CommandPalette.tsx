import React, { useState, useCallback, useEffect } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, BarChart3, Home, FolderOpen, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AddTaskForm from './AddTaskForm';

interface CommandPaletteProps {
  isAddTaskOpen: boolean;
  setIsAddTaskOpen: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isAddTaskOpen, setIsAddTaskOpen }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentDate, handleAddTask, sections } = useTasks();
  const isMobile = useIsMobile();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prevOpen) => !prevOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    callback();
  }, []);

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
    }
    return success;
  };

  const CommandWrapper = isMobile ? Sheet : CommandDialog;
  const CommandContent = isMobile ? SheetContent : CommandDialog;
  const CommandHeader = isMobile ? SheetHeader : undefined;
  const CommandTitle = isMobile ? SheetTitle : undefined;

  return (
    <>
      <CommandWrapper open={open} onOpenChange={setOpen}>
        {isMobile && CommandHeader && CommandTitle && (
          <CommandHeader>
            <CommandTitle>Command Palette</CommandTitle>
          </CommandHeader>
        )}
        <CommandContent className={isMobile ? "h-full" : ""}>
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
                    // Logic to filter tasks by section or navigate to a section view
                    // For now, we'll just log it. In a real app, you'd update a filter state.
                    console.log(`Selected section: ${section.name}`);
                    navigate('/'); // Go to home page
                    // You might want to set a section filter here in useTasks context
                    // setSectionFilter(section.id);
                  })}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    <span>Go to {section.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandContent>
      </CommandWrapper>

      {/* Add Task Dialog/Sheet, controlled by Command Palette */}
      <CommandWrapper open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        {isMobile && CommandHeader && CommandTitle && (
          <CommandHeader>
            <CommandTitle>Add New Task</CommandTitle>
          </CommandHeader>
        )}
        <CommandContent className={isMobile ? "h-full" : ""}>
          <AddTaskForm onAddTask={handleNewTaskSubmit} userId={user?.id || null} onTaskAdded={() => setIsAddTaskOpen(false)} />
        </CommandContent>
      </CommandWrapper>
    </>
  );
};

export default CommandPalette;