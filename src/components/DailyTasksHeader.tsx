import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ListTodo, Brain, CheckCircle2, Clock } from 'lucide-react';
import DateNavigator from '@/components/DateNavigator';
import TaskFilter from '@/components/TaskFilter';
import { cn } from '@/lib/utils';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { isBefore, isSameDay, parseISO } from 'date-fns';

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
}) => {
  const { dailyTaskCount } = useDailyTaskCount();
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col bg-background sticky top-0 z-10 shadow-sm">
      {/* Top Bar: Task Count & Utility Buttons */}
      <div className="flex items-center justify-between px-4 pt-4">
        {/* Left: Task Count */}
        <div className="flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold">{dailyTaskCount}</span>
        </div>

        {/* Right: Utility Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFocusPanelOpen(true)}
            aria-label="Open focus tools"
            className="h-9 w-9"
          >
            <Brain className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Date Navigator */}
      <DateNavigator
        currentDate={currentDate}
        onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
        onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
        onGoToToday={() => setCurrentDate(new Date())}
        setCurrentDate={setCurrentDate}
      />

      {/* Today's Summary (replaces Status Badges and TodayProgressCard) */}
      <div className="flex items-center justify-center gap-4 px-4 pb-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <ListTodo className="h-4 w-4 text-foreground" />
          <span className="font-semibold text-foreground">{totalCount - completedCount} pending</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-primary">{completedCount} completed</span>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-destructive">{overdueCount} overdue</span>
          </div>
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
              placeholder='Quick add a task — press "/" to focus, Enter to add'
              value={quickAddTaskDescription}
              onChange={(e) => setQuickAddTaskDescription(e.target.value)}
              className="flex-1 h-9 text-sm"
            />
            <Button type="submit" className="whitespace-nowrap h-9 text-sm">
              <Plus className="mr-1 h-3 w-3" /> Add
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
    </div>
  );
};

export default DailyTasksHeader;