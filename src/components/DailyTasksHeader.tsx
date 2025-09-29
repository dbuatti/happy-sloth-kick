import React from 'react';
import DateNavigator from './DateNavigator';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import DailyOverviewCard from './DailyOverviewCard';
import { Button } from '@/components/ui/button';
import { Filter as FilterIcon, Settings as SettingsIcon, Archive as ArchiveIcon, ListTodo, ChevronsDownUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';

interface DailyTasksHeaderProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  tasks: Task[];
  filteredTasks: Task[];
  sections: TaskSection[];
  allCategories: Category[];
  userId: string | null;
  // Removed setIsFocusPanelOpen as it's not used directly in this component
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
  // Removed doTodayOffIds as it's not used directly in this component
  // Removed toggleDoToday as it's not used directly in this component
  onToggleAllSections: () => void;
  isManageCategoriesOpen: boolean;
  setIsManageCategoriesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isManageSectionsOpen: boolean;
  setIsManageSectionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFilterPanelOpen: boolean;
  toggleFilterPanel: () => void;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  sections,
  allCategories,
  // Removed setIsFocusPanelOpen from destructuring
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
  // Removed doTodayOffIds from destructuring
  // Removed toggleDoToday from destructuring
  onToggleAllSections,
  isManageCategoriesOpen,
  setIsManageCategoriesOpen,
  isManageSectionsOpen,
  setIsManageSectionsOpen,
  isFilterPanelOpen,
  toggleFilterPanel,
}) => {
  return (
    <div className="sticky top-0 z-10 flex flex-col bg-background bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--secondary)/0.05)] dark:from-[hsl(var(--primary)/0.1)] dark:to-[hsl(var(--secondary)/0.1)] rounded-b-2xl shadow-lg pb-4 px-4 lg:px-6">
      <div className="flex items-center justify-between pt-4 pb-3">
        <h1 className="text-3xl font-bold tracking-tight">Daily Tasks</h1>
        <div className="flex items-center gap-2">
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
              <DropdownMenuItem onClick={archiveAllCompletedTasks}>
                <ArchiveIcon className="mr-2 h-4 w-4" /> Archive All Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleAllDoToday}>
                <ChevronsDownUp className="mr-2 h-4 w-4" /> Toggle All "Do Today"
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleAllSections}>
                <ChevronsDownUp className="mr-2 h-4 w-4" /> Toggle All Sections
              </DropdownMenuItem>
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

      <DailyOverviewCard
        dailyProgress={dailyProgress}
        nextAvailableTask={nextAvailableTask}
        updateTask={updateTask}
        onOpenOverview={onOpenOverview}
        onOpenFocusView={onOpenFocusView}
        tasksLoading={tasksLoading}
        isDemo={isDemo}
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