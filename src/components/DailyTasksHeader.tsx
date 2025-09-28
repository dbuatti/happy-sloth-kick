import React from 'react'; // Removed useRef
import DateNavigator from './DateNavigator';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import DailyOverviewCard from './DailyOverviewCard';
import { Button } from '@/components/ui/button';
import { Filter as FilterIcon } from 'lucide-react'; // Import Filter icon

interface DailyTasksHeaderProps {
  currentDate: Date; // FIX: Changed type from React.SetStateAction<Date> to Date
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  tasks: Task[]; // Added
  filteredTasks: Task[]; // Added
  sections: TaskSection[];
  allCategories: Category[];
  userId: string | null;
  setIsFocusPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Removed filter-related props as they are now handled by FilterPanel
  // searchFilter: string;
  // setSearchFilter: (value: string) => void;
  // statusFilter: string;
  // setStatusFilter: (value: string) => void;
  // categoryFilter: string;
  // setCategoryFilter: (value: string) => void;
  // priorityFilter: string;
  // setPriorityFilter: (value: string) => void;
  // sectionFilter: string;
  // setSectionFilter: (value: string) => void;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
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
  onToggleAllSections: () => void;
  isManageCategoriesOpen: boolean; // Added
  setIsManageCategoriesOpen: React.Dispatch<React.SetStateAction<boolean>>; // Added
  isManageSectionsOpen: boolean; // Added
  setIsManageSectionsOpen: React.Dispatch<React.SetStateAction<boolean>>; // Added
  isFilterPanelOpen: boolean; // New prop
  toggleFilterPanel: () => void; // New prop
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  sections,
  allCategories,
  setIsFocusPanelOpen,
  // Removed filter-related props from destructuring
  // searchFilter,
  // setSearchFilter,
  // statusFilter,
  // setStatusFilter,
  // categoryFilter,
  // setCategoryFilter,
  // priorityFilter,
  // setPriorityFilter,
  // sectionFilter,
  // setSectionFilter,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  dailyProgress,
  isDemo = false,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenFocusView,
  tasksLoading,
  doTodayOffIds,
  toggleDoToday,
  onToggleAllSections,
  isManageCategoriesOpen,
  setIsManageCategoriesOpen,
  isManageSectionsOpen,
  setIsManageSectionsOpen,
  isFilterPanelOpen,
  toggleFilterPanel,
}) => {
  // Removed searchInputRef as it's no longer used in this component
  // const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sticky top-0 z-10 flex flex-col bg-background bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--secondary)/0.05)] dark:from-[hsl(var(--primary)/0.1)] dark:to-[hsl(var(--secondary)/0.1)] rounded-b-2xl shadow-lg pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
          onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
          onGoToToday={() => setCurrentDate(new Date())}
          setCurrentDate={setCurrentDate}
        />
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
      </div>

      <DailyOverviewCard
        dailyProgress={dailyProgress}
        nextAvailableTask={nextAvailableTask}
        updateTask={updateTask}
        onOpenOverview={onOpenOverview}
        onOpenFocusView={onOpenFocusView}
        tasksLoading={tasksLoading}
        isDemo={isDemo}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        archiveAllCompletedTasks={archiveAllCompletedTasks}
        toggleAllDoToday={toggleAllDoToday}
        setIsFocusPanelOpen={setIsFocusPanelOpen}
        setIsManageCategoriesOpen={setIsManageCategoriesOpen}
        setIsManageSectionsOpen={setIsManageSectionsOpen}
        onToggleAllSections={onToggleAllSections}
      />

      {/* TaskFilter component is removed from here */}

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