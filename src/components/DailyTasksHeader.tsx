import React, { SetStateAction, useState, useCallback } from 'react';
import DateNavigator from './DateNavigator';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import DailyOverviewCard from './DailyOverviewCard';
import { Button } from '@/components/ui/button';
import { Filter as FilterIcon, Settings as SettingsIcon, ListTodo, ChevronsDownUp, Plus, CheckCircle2, XSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';
import QuickAddTask from '@/components/QuickAddTask';
import { Checkbox } from '@/components/ui/checkbox';
import ConfirmationDialog from './ConfirmationDialog';

interface DailyTasksHeaderProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  tasks: Task[];
  filteredTasks: Task[];
  sections: TaskSection[];
  allCategories: Category[];
  userId: string | null;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  createCategory: (name: string, color: string) => Promise<string | null>;
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>; // Updated signature
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
  onToggleAllSections: () => void;
  isManageCategoriesOpen: boolean;
  setIsManageCategoriesOpen: React.Dispatch<SetStateAction<boolean>>;
  isManageSectionsOpen: boolean;
  setIsManageSectionsOpen: React.Dispatch<SetStateAction<boolean>>;
  isFilterPanelOpen: boolean;
  toggleFilterPanel: () => void;
  markAllTasksAsCompleted: () => Promise<void>;
  markAllTasksAsSkipped?: () => Promise<void>;
  onOpenAddTaskDialog?: () => void;
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  selectedCount: number;
  isSelectAllChecked: boolean;
  onToggleSelectAll: () => void;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
  archiveAllCompletedTasks,
  toggleAllDoToday, // Destructure updated toggleAllDoToday
  dailyProgress,
  isDemo = false,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenFocusView,
  tasksLoading,
  onToggleAllSections,
  isManageCategoriesOpen,
  setIsManageCategoriesOpen,
  isManageSectionsOpen,
  setIsManageSectionsOpen,
  isFilterPanelOpen,
  toggleFilterPanel,
  markAllTasksAsCompleted,
  markAllTasksAsSkipped,
  onOpenAddTaskDialog,
  handleAddTask,
  selectedCount,
  isSelectAllChecked,
  onToggleSelectAll,
}) => {
  const [isConfirmMarkAllDoneOpen, setIsConfirmMarkAllDoneOpen] = useState(false);
  const [isConfirmMarkAllSkippedOpen, setIsConfirmMarkAllSkippedOpen] = useState(false);

  // Wrapper for createSection to match ManageSectionsDialogProps
  const createSectionForDialog = useCallback(async (name: string) => {
    await createSection(name);
  }, [createSection]);

  // Wrapper for updateSection to match ManageSectionsDialogProps
  const updateSectionForDialog = useCallback(async (id: string, newName: string) => {
    const originalSection = sections.find(s => s.id === id);
    await updateSection(id, newName, originalSection?.include_in_focus_mode ?? true); // Use originalSection
  }, [updateSection, sections]);

  return (
    <div className="sticky top-0 z-10 flex flex-col bg-background bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--secondary)/0.05)] dark:from-[hsl(var(--primary)/0.1)] dark:to-[hsl(var(--secondary)/0.1)] rounded-b-2xl shadow-lg pb-4 px-4 lg:px-6">
      <div className="flex items-center justify-between pt-4 pb-3">
        <h1 className="text-3xl font-bold tracking-tight">Daily Tasks</h1>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={isSelectAllChecked}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all filtered tasks"
              />
              <span>{selectedCount} selected</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFilterPanel}
            className="flex items-center gap-2"
            aria-expanded={isFilterPanelOpen}
            aria-controls="filter-panel"
          >
            <FilterIcon className="h-4 w-4" />
            Filters
          </Button>

          {onOpenAddTaskDialog && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAddTaskDialog}
              className="flex items-center gap-2"
              disabled={isDemo}
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Manage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsManageCategoriesOpen(true)}>
                <ListTodo className="mr-2 h-4 w-4" /> Manage Categories
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManageSectionsOpen(true)}>
                <ListTodo className="mr-2 h-4 w-4" /> Manage Sections
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleAllSections}>
                <ChevronsDownUp className="mr-2 h-4 w-4" /> Toggle All Sections
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsConfirmMarkAllDoneOpen(true)}
                disabled={isDemo || dailyProgress.totalPendingCount === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All Pending as Completed
              </DropdownMenuItem>
              {markAllTasksAsSkipped && (
                <DropdownMenuItem
                  onClick={() => setIsConfirmMarkAllSkippedOpen(true)}
                  disabled={isDemo || dailyProgress.totalPendingCount === 0}
                >
                  <XSquare className="h-4 w-4 mr-2" /> Mark All Pending as Skipped
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DateNavigator
        currentDate={currentDate}
        onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
        onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
        onGoToToday={() => setCurrentDate(new Date())}
        setCurrentDate={setCurrentDate}
      />

      <Separator className="my-4" />

      <QuickAddTask
        onAddTask={handleAddTask}
        defaultCategoryId={allCategories[0]?.id || ''}
        isDemo={isDemo}
        allCategories={allCategories}
        currentDate={currentDate}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />

      <Separator className="my-4" />

      <DailyOverviewCard
        dailyProgress={dailyProgress}
        nextAvailableTask={nextAvailableTask}
        updateTask={updateTask}
        onOpenOverview={onOpenOverview}
        onOpenFocusView={onOpenFocusView}
        tasksLoading={tasksLoading}
        isDemo={isDemo}
        archiveAllCompletedTasks={archiveAllCompletedTasks}
        toggleAllDoToday={toggleAllDoToday}
        markAllTasksAsSkipped={markAllTasksAsSkipped}
      />

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={allCategories}
        onCategoryCreated={createCategory}
        onCategoryDeleted={deleteCategory}
        onCategoryUpdated={updateCategory}
      />

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSectionForDialog}
        updateSection={updateSectionForDialog}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />

      <ConfirmationDialog
        isOpen={isConfirmMarkAllDoneOpen}
        onClose={() => setIsConfirmMarkAllDoneOpen(false)}
        onConfirm={() => {
          markAllTasksAsCompleted();
          setIsConfirmMarkAllDoneOpen(false);
        }}
        title="Confirm Mark All Pending as Completed"
        description="Are you sure you want to mark all pending tasks as completed for today? This action cannot be undone easily."
        confirmText="Mark All Done"
        confirmVariant="default"
      />

      <ConfirmationDialog
        isOpen={isConfirmMarkAllSkippedOpen}
        onClose={() => setIsConfirmMarkAllSkippedOpen(false)}
        onConfirm={() => {
          markAllTasksAsSkipped?.();
          setIsConfirmMarkAllSkippedOpen(false);
        }}
        title="Confirm Mark All Pending as Skipped"
        description="Are you sure you want to mark all pending tasks as skipped for today? This action cannot be undone easily."
        confirmText="Mark All Skipped"
        confirmVariant="destructive"
      />
    </div>
  );
};

export default DailyTasksHeader;