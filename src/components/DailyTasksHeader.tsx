import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings } from 'lucide-react';
import DateNavigator from './DateNavigator';
import TaskFilter from './TaskFilter';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import DailyOverviewCard from './DailyOverviewCard'; // Import the new component

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  // Removed handleQuickAdd as quick add is moving

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
        {/* Settings button is now removed from here as its actions are in DailyOverviewCard */}
      </div>

      {/* Daily Overview Card (combines Next Task and Progress) */}
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
      />

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