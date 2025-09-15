import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ListTodo, Brain, CheckCircle2, Clock, Target, Edit, Sparkles, FolderOpen, Tag, Archive, ToggleRight } from 'lucide-react';
import DateNavigator from './DateNavigator';
import TaskFilter from './TaskFilter';
import { cn } from '@/lib/utils';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { useSound } from '@/context/SoundContext';
import { Progress } from '@/components/Progress';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import DoTodaySwitch from './DoTodaySwitch';
import { Label } from '@/components/ui/label';

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
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenOverview: (task: Task) => void;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  doTodayOffIds: Set<string>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
  setIsAddTaskDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPrefilledTaskData: React.Dispatch<React.SetStateAction<Partial<Task> | null>>;
  dailyProgress: {
    totalPendingCount: number;
    completedCount: number;
    overdueCount: number;
  };
  isDemo?: boolean;
  toggleDoToday: (task: Task) => void;
  onOpenFocusView: () => void;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
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
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  doTodayOffIds,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  setIsAddTaskDialogOpen,
  setPrefilledTaskData,
  dailyProgress,
  isDemo = false,
  toggleDoToday,
  onOpenFocusView,
}) => {
  useDailyTaskCount(); 
  const { playSound } = useSound();
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const { totalPendingCount, completedCount, overdueCount } = dailyProgress;

  const handleQuickAdd = async () => {
    const description = quickAddTaskDescription.trim();
    if (!description) {
      setPrefilledTaskData(null);
      setIsAddTaskDialogOpen(true);
      return;
    }

    const loadingToastId = showLoading('Getting AI suggestions...');
    try {
      const categoriesForAI = allCategories.map(cat => ({ id: cat.id, name: cat.name }));
      const suggestions = await suggestTaskDetails(description, categoriesForAI, currentDate);
      dismissToast(loadingToastId);

      if (!suggestions) {
        showError('AI suggestions failed. Please add task details manually.');
        setPrefilledTaskData({ description });
        setIsAddTaskDialogOpen(true);
        setQuickAddTaskDescription('');
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
    } catch (error) {
      dismissToast(loadingToastId);
      showError('An error occurred. Please add task details manually.');
      setPrefilledTaskData({ description });
      setIsAddTaskDialogOpen(true);
      setQuickAddTaskDescription('');
    }
  };

  const quickAddBarRef = useRef<HTMLDivElement>(null);

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleMarkNextTaskComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      playSound('success');
    }
  };

  const totalTasksForProgress = totalPendingCount + completedCount;

  return (
    <div className="flex flex-col bg-gradient-to-br from-[hsl(var(--gradient-start-light))] to-[hsl(var(--gradient-end-light))] dark:from-[hsl(var(--gradient-start-dark))] dark:to-[hsl(var(--gradient-end-dark))] rounded-b-2xl shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pt-4">
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
            className="h-10 w-10 hover:bg-primary/10 text-primary"
            disabled={isDemo}
          >
            <Tag className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsManageSectionsOpen(true)}
            aria-label="Manage Sections"
            className="h-10 w-10 hover:bg-primary/10 text-primary"
            disabled={isDemo}
          >
            <FolderOpen className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFocusPanelOpen(true)}
            aria-label="Open focus tools"
            className="h-10 w-10 hover:bg-primary/10 text-primary"
          >
            <Brain className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-3 pt-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <ListTodo className="h-4 w-4 text-foreground" />
            <span className="font-semibold text-foreground text-lg">{totalPendingCount} pending</span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary text-lg">{completedCount} completed</span>
          </span>
        </div>
        <Progress
          value={totalTasksForProgress > 0 ? (completedCount / totalTasksForProgress) * 100 : 0}
          className="h-4 rounded-full"
          indicatorClassName="bg-gradient-to-r from-primary to-accent rounded-full"
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 gap-2">
          {overdueCount > 0 ? (
            <p className="text-sm text-destructive flex items-center gap-1">
              <Clock className="h-4 w-4" /> {overdueCount} overdue
            </p>
          ) : <div />}
          <div className="flex items-center gap-2 self-end">
            <Button variant="outline" size="sm" onClick={toggleAllDoToday} className="h-8 text-xs" disabled={isDemo}>
              <ToggleRight className="mr-2 h-3.5 w-3.5" /> Toggle All 'Do Today'
            </Button>
            {completedCount > 0 && (
              <Button variant="outline" size="sm" onClick={archiveAllCompletedTasks} className="h-8 text-xs" disabled={isDemo}>
                <Archive className="mr-2 h-3.5 w-3.5" /> Archive Completed
              </Button>
            )}
          </div>
        </div>
      </div>

      <div
        ref={quickAddBarRef}
        className="quick-add-bar px-4 py-3 border border-input rounded-xl mx-4 mb-4 bg-background"
      >
        <div className="flex items-center gap-2">
          <Input
            ref={quickAddInputRef}
            placeholder='Quick add a task (AI-powered) — press "/" to focus, Enter to add'
            value={quickAddTaskDescription}
            onChange={(e) => setQuickAddTaskDescription(e.target.value)}
            className="flex-1 h-10 text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            disabled={isDemo}
          />
          <Button type="button" onClick={handleQuickAdd} className="whitespace-nowrap h-10 text-base" disabled={isDemo}>
            <Plus className="mr-1 h-4 w-4" /> Add <Sparkles className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

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
        onCategoryCreated={() => {}}
        onCategoryDeleted={() => {}}
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