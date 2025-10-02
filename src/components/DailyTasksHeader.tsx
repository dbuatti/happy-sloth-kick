import React, { useState, useCallback } from 'react'; // Removed useMemo
import { format, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, Filter, Settings, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import DailyOverviewCard from './DailyOverviewCard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';

interface DailyTasksHeaderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  tasks: Task[];
  filteredTasks: Task[];
  sections: TaskSection[];
  allCategories: Category[];
  userId: string | null;
  createSection: (name: string, includeInFocusMode: boolean) => Promise<void>;
  updateSection: (id: string, name: string, includeInFocusMode: boolean) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (id: string, includeInFocusMode: boolean) => Promise<void>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: (filteredTasks: Task[]) => Promise<void>;
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
  setIsManageCategoriesOpen: (isOpen: boolean) => void;
  isManageSectionsOpen: boolean;
  setIsManageSectionsOpen: (isOpen: boolean) => void;
  isFilterPanelOpen: boolean;
  toggleFilterPanel: () => void;
  markAllTasksAsCompleted: () => Promise<void>;
  onOpenAddTaskDialog: (parentTaskId?: string | null, sectionId?: string | null) => void;
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  selectedCount: number;
  isSelectAllChecked: boolean;
  onToggleSelectAll: () => void;
  markAllTasksAsSkipped: () => Promise<void>;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  filteredTasks,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  dailyProgress,
  isDemo,
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
  onOpenAddTaskDialog,
  markAllTasksAsSkipped,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setIsCalendarOpen(false);
    }
  }, [setCurrentDate]);

  const handlePreviousDay = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  }, [currentDate, setCurrentDate]);

  const handleNextDay = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  }, [currentDate, setCurrentDate]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  const formattedDate = format(currentDate, 'EEEE, MMM d, yyyy');
  const isToday = isSameDay(currentDate, new Date());

  const handleToggleAllDoToday = useCallback(async () => {
    await toggleAllDoToday(filteredTasks);
  }, [toggleAllDoToday, filteredTasks]);

  // Wrapper for createSection to match ManageSectionsDialogProps
  const createSectionForDialog = useCallback(async (name: string) => {
    await createSection(name, true); // Default to include in focus mode
  }, [createSection]);

  // Wrapper for updateSection to match ManageSectionsDialogProps
  const updateSectionForDialog = useCallback(async (id: string, newName: string) => {
    // Find the original section to preserve its include_in_focus_mode status
    const originalSection = sections.find(s => s.id === id);
    await updateSection(id, newName, originalSection?.include_in_focus_mode ?? true);
  }, [updateSection, sections]);


  return (
    <div className="bg-card border-b border-border p-4 lg:p-6 sticky top-0 z-40">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePreviousDay} aria-label="Previous day">
            <ChevronDown className="h-5 w-5 rotate-90" />
          </Button>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !currentDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formattedDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={handleNextDay} aria-label="Next day">
            <ChevronDown className="h-5 w-5 -rotate-90" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenAddTaskDialog()} disabled={isDemo}>
            <Plus className="h-4 w-4 mr-2" /> Add Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFilterPanel}
            className={cn(isFilterPanelOpen && "bg-accent text-accent-foreground")}
          >
            <Filter className="h-4 w-4 mr-2" /> Filter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" /> Manage <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsManageCategoriesOpen(true)}>
                Manage Categories
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManageSectionsOpen(true)}>
                Manage Sections
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleAllSections}>
                Toggle All Sections
              </DropdownMenuItem>
              <DropdownMenuItem onClick={markAllTasksAsCompleted}>
                Mark All Pending Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleAllDoToday}>
                Toggle All Do Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={markAllTasksAsSkipped}>
                Mark All Pending Skipped
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DailyOverviewCard
        dailyProgress={dailyProgress}
        nextAvailableTask={nextAvailableTask}
        updateTask={updateTask}
        onOpenOverview={onOpenOverview}
        onOpenFocusView={onOpenFocusView}
        tasksLoading={tasksLoading}
        isDemo={isDemo}
        archiveAllCompletedTasks={archiveAllCompletedTasks}
        toggleAllDoToday={handleToggleAllDoToday}
        markAllTasksAsSkipped={markAllTasksAsSkipped}
      />

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={allCategories}
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
    </div>
  );
};

export default DailyTasksHeader;