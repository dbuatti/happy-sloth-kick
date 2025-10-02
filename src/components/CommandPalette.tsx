"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Search, Target, Calendar as CalendarIcon, ListTodo, FolderOpen, Users, Link as LinkIcon, Moon, Sun, Laptop, Goal, Clock, Brain, BookOpen, Utensils, Archive, Settings as SettingsIcon, BellRing, MessageSquare, Lightbulb, Code, GitBranch, FileText, Image, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { useTasks, Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { useReminders } from '@/context/ReminderContext';
import { useProjects } from '@/hooks/useProjects';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { useHabits } from '@/hooks/useHabits';
import { useWeeklyFocus } from '@/hooks/useWeeklyFocus';
import { useAppointments } from '@/hooks/useAppointments';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useDevIdeas } from '@/hooks/useDevIdeas';
import { useMeals } from '@/hooks/useMeals';
import { useGoals } from '@/hooks/useGoals';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, parseISO, isValid } from 'date-fns';
import TaskForm from './TaskForm';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface CommandPaletteProps {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (isOpen: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isCommandPaletteOpen, setIsCommandPaletteOpen }) => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings: userSettings, updateSettings } = useSettings();
  const { scheduleReminder, cancelReminder } = useReminders();

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [preselectedParentTaskId, setPreselectedParentTaskId] = useState<string | null>(null);
  const [preselectedSectionIdForSubtask, setPreselectedSectionIdForSubtask] = useState<string | null>(null);

  const currentDate = new Date();

  const {
    processedTasks,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    handleAddTask,
    updateTask,
    setFocusTask,
    createCategory, // Destructure
    updateCategory, // Destructure
    deleteCategory, // Destructure
  } = useTasks({ currentDate, userId: user?.id });

  const { projects } = useProjects();
  const { peopleMemory } = usePeopleMemory();
  const { quickLinks } = useQuickLinks();
  const { habits } = useHabits();
  const { weeklyFocus } = useWeeklyFocus();
  const { appointments } = useAppointments();
  const { gratitudeEntries, worryEntries } = useJournalEntries();
  const { devIdeas } = useDevIdeas();
  const { meals } = useMeals();
  const { goals } = useGoals();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  const handleGlobalSearch = useCallback(async (term: string) => {
    if (!user?.id || !term.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoadingSearch(true);
    try {
      const { data, error } = await supabase.rpc('global_search', { search_term: term, user_id: user.id });
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error during global search:', error.message);
      setSearchResults([]);
    } finally {
      setIsLoadingSearch(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        handleGlobalSearch(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search input

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, handleGlobalSearch]);

  const openAddTaskDialog = useCallback((parentTaskId: string | null = null, sectionId: string | null = null) => {
    setPreselectedParentTaskId(parentTaskId);
    setPreselectedSectionIdForSubtask(sectionId);
    setIsAddTaskDialogOpen(true);
  }, []);

  const handleNewTaskSubmit = useCallback(async (taskData: NewTaskData) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsAddTaskDialogOpen(false);
      showSuccess('Task added!');
    } else {
      showError('Failed to add task.');
    }
    return success;
  }, [handleAddTask]);

  const handleSetFocusTask = useCallback(async (taskId: string | null) => {
    await setFocusTask(taskId);
    setIsCommandPaletteOpen(false);
  }, [setFocusTask, setIsCommandPaletteOpen]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setIsCommandPaletteOpen(false);
  }, [navigate, setIsCommandPaletteOpen]);

  const handleThemeChange = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsCommandPaletteOpen(false);
  }, [setTheme, setIsCommandPaletteOpen]);

  const handleOpenLink = useCallback((link: string) => {
    window.open(link, '_blank');
    setIsCommandPaletteOpen(false);
  }, [setIsCommandPaletteOpen]);

  const handleOpenLocalFile = useCallback((path: string) => {
    // This would typically require a native integration (e.g., Electron, Tauri)
    // For web, we can only log or show a message.
    showError(`Cannot open local file directly in web browser: ${path}`);
    console.log(`Attempted to open local file: ${path}`);
    setIsCommandPaletteOpen(false);
  }, [setIsCommandPaletteOpen]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'task': return <ListTodo className="mr-2 h-4 w-4" />;
      case 'project': return <FolderOpen className="mr-2 h-4 w-4" />;
      case 'person_memory': return <Users className="mr-2 h-4 w-4" />;
      case 'quick_link': return <LinkIcon className="mr-2 h-4 w-4" />;
      case 'task_section': return <ListTodo className="mr-2 h-4 w-4" />;
      case 'habit': return <Repeat className="mr-2 h-4 w-4" />;
      case 'weekly_focus': return <Target className="mr-2 h-4 w-4" />;
      case 'appointment': return <CalendarIcon className="mr-2 h-4 w-4" />;
      case 'dashboard_card': return <LayoutGrid className="mr-2 h-4 w-4" />;
      case 'goal': return <Goal className="mr-2 h-4 w-4" />;
      default: return <Search className="mr-2 h-4 w-4" />;
    }
  };

  const getActionForSearchResult = useCallback((result: any) => {
    switch (result.type) {
      case 'task':
        return () => handleNavigate(`/daily-tasks?taskId=${result.id}`);
      case 'project':
        return () => handleNavigate(`/projects?projectId=${result.id}`);
      case 'person_memory':
        return () => handleNavigate(`/people?personId=${result.id}`);
      case 'quick_link':
        return () => result.link ? handleOpenLink(result.link) : null;
      case 'task_section':
        return () => handleNavigate(`/daily-tasks?sectionId=${result.id}`);
      case 'habit':
        return () => handleNavigate(`/habits?habitId=${result.id}`);
      case 'weekly_focus':
        return () => handleNavigate(`/weekly-focus?focusId=${result.id}`);
      case 'appointment':
        return () => handleNavigate(`/schedule?appointmentId=${result.id}`);
      case 'dashboard_card':
        return () => handleNavigate(`/dashboard?cardId=${result.id}`);
      case 'goal':
        return () => handleNavigate(`/resonance-goals?goalId=${result.id}`);
      default:
        return () => console.log('No specific action for this type:', result.type);
    }
  }, [handleNavigate, handleOpenLink]);

  const isMac = typeof window !== 'undefined' ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 : false;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setIsCommandPaletteOpen, isMac]);

  return (
    <>
      <CommandDialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <CommandInput
          placeholder="Type a command or search..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          {isLoadingSearch && <CommandEmpty>Searching...</CommandEmpty>}
          {!isLoadingSearch && searchTerm && searchResults.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
          {!searchTerm && (
            <>
              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => handleNavigate('/dashboard')}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/daily-tasks')}>
                  <ListTodo className="mr-2 h-4 w-4" />
                  <span>Daily Tasks</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/projects')}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span>Projects</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/schedule')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>Schedule</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/focus')}>
                  <Target className="mr-2 h-4 w-4" />
                  <span>Focus Mode</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/dev-space')}>
                  <Code className="mr-2 h-4 w-4" />
                  <span>Dev Space</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/meal-planner')}>
                  <Utensils className="mr-2 h-4 w-4" />
                  <span>Meal Planner</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/resonance-goals')}>
                  <Goal className="mr-2 h-4 w-4" />
                  <span>Resonance Goals</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/sleep')}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Sleep Tracker</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/analytics')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Analytics</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/archive')}>
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archive</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/settings')}>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </CommandItem>
                <CommandItem onSelect={() => handleNavigate('/help')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => openAddTaskDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add New Task</span>
                </CommandItem>
                {userSettings?.focused_task_id && (
                  <CommandItem onSelect={() => handleSetFocusTask(null)}>
                    <X className="mr-2 h-4 w-4" />
                    <span>Clear Focus Task</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Theme">
                <CommandItem onSelect={() => handleThemeChange('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </CommandItem>
                <CommandItem onSelect={() => handleThemeChange('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </CommandItem>
                <CommandItem onSelect={() => handleThemeChange('system')}>
                  <Laptop className="mr-2 h-4 w-4" />
                  <span>System</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
          {searchTerm && searchResults.length > 0 && (
            <CommandGroup heading="Search Results">
              {searchResults.map((result) => (
                <CommandItem key={result.id} onSelect={getActionForSearchResult(result)}>
                  {getIconForType(result.type)}
                  <span>{result.title}</span>
                  {result.description && <span className="ml-2 text-muted-foreground text-sm truncate">{result.description}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Add Task Dialog (for mobile/sheet) */}
      <Sheet open={isAddTaskDialogOpen && window.innerWidth < 768} onOpenChange={setIsAddTaskDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{preselectedParentTaskId ? "Add Subtask" : "Add New Task"}</SheetTitle>
          </SheetHeader>
          <TaskForm
            onSave={handleNewTaskSubmit}
            onCancel={() => setIsAddTaskDialogOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={new Date()}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={processedTasks}
            preselectedParentTaskId={preselectedParentTaskId}
            preselectedSectionId={preselectedSectionIdForSubtask}
            createCategory={createCategory} // Pass through
            updateCategory={updateCategory} // Pass through
            deleteCategory={deleteCategory} // Pass through
          />
        </SheetContent>
      </Sheet>

      {/* Add Task Dialog (for desktop/dialog) */}
      <Dialog open={isAddTaskDialogOpen && window.innerWidth >= 768} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preselectedParentTaskId ? "Add Subtask" : "Add New Task"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            onSave={handleNewTaskSubmit}
            onCancel={() => setIsAddTaskDialogOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={new Date()}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={processedTasks}
            preselectedParentTaskId={preselectedParentTaskId}
            preselectedSectionId={preselectedSectionIdForSubtask}
            createCategory={createCategory} // Pass through
            updateCategory={updateCategory} // Pass through
            deleteCategory={deleteCategory} // Pass through
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommandPalette;