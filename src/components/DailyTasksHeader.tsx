import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ListTodo, Brain, CheckCircle2, Clock, Sparkles, FolderOpen, Tag, Archive, ToggleRight, Settings, ChevronDown } from 'lucide-react';
import DateNavigator from './DateNavigator';
import TaskFilter from './TaskFilter';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { Progress } from '@/components/Progress';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import NextTaskCard from './dashboard/NextTaskCard';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

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
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
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
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenOverview: (task: Task) => void;
  onOpenFocusView: () => void;
  tasksLoading: boolean;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
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
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  setIsAddTaskDialogOpen,
  setPrefilledTaskData,
  dailyProgress,
  isDemo = false,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenFocusView,
  tasksLoading,
  doTodayOffIds,
  toggleDoToday,
}) => {
  useDailyTaskCount(); 
  // Removed quickAddTaskDescription state and quickAddInputRef as quick add is moving
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const { totalPendingCount, completedCount, overdueCount } = dailyProgress;

  // Removed handleQuickAdd as quick add is moving

  const totalTasksForProgress = totalPendingCount + completedCount;

  const isNextTaskDoToday = nextAvailableTask ? !doTodayOffIds.has(nextAvailableTask.original_task_id || nextAvailableTask.id) : false;

  return (
    <div className="flex flex-col bg-gradient-to-br from-[hsl(var(--gradient-start-light))] to-[hsl(var(--gradient-end-light))] dark:from-[hsl(var(--gradient-start-dark))] dark:to-[hsl(var(--gradient-end-dark))] rounded-b-2xl shadow-lg">
      {/* Top Bar: Date Navigator and Action Buttons */}
      <div className="flex items-center justify-between px-4 pt-4">
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
          onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
          onGoToToday={() => setCurrentDate(new Date())}
          setCurrentDate={setCurrentDate}
        />
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Task Settings"
                className="h-9 w-9 hover:bg-primary/10 text-primary"
                disabled={isDemo}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsManageCategoriesOpen(true)}>
                <Tag className="mr-2 h-4 w-4" /> Manage Categories
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsManageSectionsOpen(true)}>
                <FolderOpen className="mr-2 h-4 w-4" /> Manage Sections
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsFocusPanelOpen(true)}>
                <Brain className="mr-2 h-4 w-4" /> Open Focus Tools
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Next Task Card */}
      <div className="px-4 pt-2">
        <NextTaskCard
          nextAvailableTask={nextAvailableTask}
          updateTask={updateTask}
          onOpenOverview={onOpenOverview}
          loading={tasksLoading}
          onFocusViewOpen={onOpenFocusView}
          isDoToday={isNextTaskDoToday}
          toggleDoToday={toggleDoToday}
          isDemo={isDemo}
        />
      </div>

      {/* Progress and Action Buttons */}
      <Card className="mx-4 mt-4 p-4 shadow-sm rounded-xl bg-background">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <ListTodo className="h-4 w-4 text-foreground" />
            <span className="font-semibold text-foreground text-lg">{totalPendingCount} pending</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary text-lg">{completedCount} completed</span>
          </div>
        </div>
        <Progress
          value={totalTasksForProgress > 0 ? (completedCount / totalTasksForProgress) * 100 : 0}
          className="h-4 rounded-full"
          indicatorClassName="bg-gradient-to-r from-primary to-accent rounded-full"
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 gap-2">
          {overdueCount > 0 ? (
            <p className="text-sm text-destructive flex items-center gap-1">
              <Clock className="h-4 w-4" /> {overdueCount} overdue
            </p>
          ) : <div />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={isDemo}>
                Bulk Actions <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={archiveAllCompletedTasks}>
                <Archive className="mr-2 h-3.5 w-3.5" /> Archive Completed
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleAllDoToday}>
                <ToggleRight className="mr-2 h-3.5 w-3.5" /> Toggle All 'Do Today'
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Removed Quick Add Task Bar */}

      {/* Task Filter */}
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