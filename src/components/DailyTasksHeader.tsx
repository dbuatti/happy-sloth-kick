import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ListTodo, Brain, CheckCircle2, Clock, Target, Edit, Sparkles, FolderOpen, Tag } from 'lucide-react'; // Removed ChevronsDownUp, Settings
import DateNavigator from '@/components/DateNavigator';
import TaskFilter from '@/components/TaskFilter';
import { cn } from '@/lib/utils';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { isBefore, isSameDay, parseISO } from 'date-fns';
import { useSound } from '@/context/SoundContext';
import { Progress } from '@/components/Progress';
import ManageCategoriesDialog from './ManageCategoriesDialog'; // Import new dialog
import ManageSectionsDialog from './ManageSectionsDialog'; // Import new dialog

interface DailyTasksHeaderProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  tasks: Task[];
  filteredTasks: Task[];
  sections: TaskSection[];
  allCategories: Category[];
  handleAddTask: (taskData: any) => Promise<any>;
  userId: string | null;
  setIsFocusPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  sectionFilter: string;
  setSectionFilter: (value: string) => void;
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onOpenOverview: (task: Task) => void;
  // New props for section/category management
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  filteredTasks,
  sections,
  allCategories,
  handleAddTask,
  setIsFocusPanelOpen,
  searchFilter,
  setSearchFilter,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  sectionFilter,
  setSectionFilter,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  createSection, // Destructure new props
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  // Removed dailyTaskCount as it's not directly used in this component's logic
  // const { dailyTaskCount } = useDailyTaskCount(); 
  const { playSound } = useSound();
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const { totalCount, completedCount, overdueCount } = React.useMemo(() => {
    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    const focusTasks = filteredTasks.filter(t =>
      t.parent_task_id === null && // Only count top-level tasks
      (t.section_id === null || focusModeSectionIds.has(t.section_id))
    );

    const total = focusTasks.length;
    const completed = focusTasks.filter(t => t.status === 'completed').length;
    const overdue = focusTasks.filter(t => {
      if (!t.due_date) return false;
      const due = parseISO(t.due_date);
      const isOver = isBefore(due, currentDate) && !isSameDay(due, currentDate) && t.status !== 'completed';
      return isOver;
    }).length;
    return { totalCount: total, completedCount: completed, overdueCount: overdue };
  }, [filteredTasks, currentDate, sections]);

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTaskDescription.trim()) {
      showError('Task description cannot be empty.');
      return;
    }

    const loadingToastId = showLoading('Getting AI suggestions...');
    const categoriesForAI = allCategories.map(cat => ({ id: cat.id, name: cat.name }));
    const suggestions = await suggestTaskDetails(quickAddTaskDescription.trim(), categoriesForAI, currentDate);
    dismissToast(loadingToastId);

    if (!suggestions) {
      showError('Failed to get AI suggestions. Please try again.');
      return;
    }

    const suggestedCategoryId = allCategories.find(cat => cat.name.toLowerCase() === suggestions.category.toLowerCase())?.id || allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || '';
    const suggestedSectionId = sections.find(sec => sec.name.toLowerCase() === suggestions.section?.toLowerCase())?.id || null;

    const success = await handleAddTask({
      description: suggestions.cleanedDescription,
      category: suggestedCategoryId,
      priority: suggestions.priority as Task['priority'],
      due_date: suggestions.dueDate,
      notes: suggestions.notes,
      remind_at: suggestions.remindAt,
      section_id: suggestedSectionId,
      recurring_type: 'none',
      parent_task_id: null,
      link: suggestions.link,
    });

    if (success) {
      setQuickAddTaskDescription('');
      quickAddInputRef.current?.focus();
    }
  };

  // Sticky shadow cue on scroll logic for the quick add bar
  const [stuck, setStuck] = useState(false);
  const quickAddBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry.isIntersecting);
      },
      {
        rootMargin: '-1px 0px 0px 0px', // Trigger when 1px of the element is off screen
        threshold: [0, 1],
      }
    );

    if (quickAddBarRef.current) {
      observer.observe(quickAddBarRef.current);
    }

    return () => {
      if (quickAddBarRef.current) {
        observer.unobserve(quickAddBarRef.current);
      }
    };
  }, []);

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleMarkNextTaskComplete = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      playSound('success');
    }
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-[hsl(var(--gradient-start-light))] to-[hsl(var(--gradient-end-light))] dark:from-[hsl(var(--gradient-start-dark))] dark:to-[hsl(var(--gradient-end-dark))] sticky top-0 z-10 shadow-sm">
      {/* Top Bar: Date Navigator & Focus Mode Button */}
      <div className="flex items-center justify-between px-4 pt-4">
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
          onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
          onGoToToday={() => setCurrentDate(new Date())}
          setCurrentDate={setCurrentDate}
        />
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsManageCategoriesOpen(true)}
            aria-label="Manage Categories"
            className="h-10 w-10"
          >
            <Tag className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsManageSectionsOpen(true)}
            aria-label="Manage Sections"
            className="h-10 w-10"
          >
            <FolderOpen className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFocusPanelOpen(true)}
            aria-label="Open focus tools"
            className="h-10 w-10"
          >
            <Brain className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Today's Summary (Pending, Completed, Overdue) - Now with larger Progress Bar */}
      <div className="px-4 pb-3 pt-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <ListTodo className="h-4 w-4 text-foreground" />
            <span className="font-semibold text-foreground text-lg">{totalCount - completedCount} pending</span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary text-lg">{completedCount} completed</span>
          </span>
        </div>
        <Progress
          value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
          className="h-4 rounded-full"
          indicatorClassName="bg-gradient-to-r from-primary to-accent rounded-full"
        />
        {overdueCount > 0 && (
          <p className="text-sm text-destructive mt-2 flex items-center gap-1">
            <Clock className="h-4 w-4" /> {overdueCount} overdue
          </p>
        )}
      </div>

      {/* NEW: Next Up Task Display */}
      <div className="bg-card p-6 mx-4 rounded-xl shadow-lg mb-4 flex flex-col items-center text-center">
        <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
          <Target className="h-6 w-6" /> Your Next Task
        </h3>
        {nextAvailableTask ? (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className={cn("w-5 h-5 rounded-full flex-shrink-0", getPriorityDotColor(nextAvailableTask.priority))} />
              <p className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight line-clamp-2">
                {nextAvailableTask.description}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleMarkNextTaskComplete} className="h-12 px-8 text-lg">
                <CheckCircle2 className="mr-2 h-5 w-5" /> Mark Done
              </Button>
              <Button variant="outline" onClick={() => onOpenOverview(nextAvailableTask)} className="h-12 px-8 text-lg">
                <Edit className="mr-2 h-5 w-5" /> Details
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-base py-4">
            No pending tasks for today. Time to relax or add new ones!
          </p>
        )}
      </div>

      {/* Quick Add Task Bar */}
      <div
        ref={quickAddBarRef}
        className={cn(
          "quick-add-bar px-4 py-3",
          stuck ? "stuck" : ""
        )}
      >
        <form onSubmit={handleQuickAddTask}>
          <div className="flex items-center gap-2">
            <Input
              ref={quickAddInputRef}
              placeholder='Quick add a task (AI-powered) — press "/" to focus, Enter to add'
              value={quickAddTaskDescription}
              onChange={(e) => setQuickAddTaskDescription(e.target.value)}
              className="flex-1 h-10 text-base"
            />
            <Button type="submit" className="whitespace-nowrap h-10 text-base">
              <Plus className="mr-1 h-4 w-4" /> Add <Sparkles className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Task Filter and Search */}
      <TaskFilter
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        sections={sections}
        allCategories={allCategories}
        searchRef={searchInputRef}
      />

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={allCategories}
        onCategoryCreated={() => { /* useTasks handles refresh */ }}
        onCategoryDeleted={() => { /* useTasks handles refresh */ }}
      />

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />
    </div>
  );
};

export default DailyTasksHeader;