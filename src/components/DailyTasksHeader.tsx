import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays, Settings, XCircle, EyeOff } from 'lucide-react';
import {
  TaskSection,
  TaskCategory,
  DailyTaskCount,
  Task,
} from '@/types/task';
import { format } from 'date-fns';
import QuickAddTask from './QuickAddTask';
import ManageSectionsDialog from './ManageSectionsDialog';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import { DailyTasksHeaderProps } from '@/types/props';

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  dailyProgress,
  toggleAllDoToday,
  currentDate,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
  onAddTask,
  setPrefilledTaskData,
  isDemo,
  onUpdate, // Added from TaskActionProps
  onDelete, // Added from TaskActionProps
  onReorderTasks, // Added from TaskActionProps
  onStatusChange, // Added from TaskActionProps
}) => {
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const handleToggleAllDoToday = (turnOff: boolean) => {
    toggleAllDoToday(turnOff);
  };

  const allDoTodayOff = dailyProgress.totalPendingCount === 0; // Simplified check

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold flex items-center">
          <CalendarDays className="mr-3 h-7 w-7 text-primary" />
          Today's Tasks ({format(currentDate, 'PPP')})
        </h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsManageSectionsOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" /> Manage Sections
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsManageCategoriesOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card text-card-foreground rounded-lg shadow p-4">
          <h3 className="text-sm font-medium">Total Pending</h3>
          <p className="text-2xl font-bold">{dailyProgress.totalPendingCount}</p>
        </div>
        <div className="bg-card text-card-foreground rounded-lg shadow p-4">
          <h3 className="text-sm font-medium">Completed</h3>
          <p className="text-2xl font-bold">{dailyProgress.completedCount}</p>
        </div>
        <div className="bg-card text-card-foreground rounded-lg shadow p-4">
          <h3 className="text-sm font-medium">Overdue</h3>
          <p className="text-2xl font-bold text-red-500">{dailyProgress.overdueCount}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <QuickAddTask
          onAddTask={onAddTask}
          sections={sections}
          allCategories={allCategories}
          currentDate={currentDate}
          setPrefilledTaskData={setPrefilledTaskData}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onReorderTasks={onReorderTasks}
          onStatusChange={onStatusChange}
        />
        <Button
          variant="outline"
          onClick={() => handleToggleAllDoToday(!allDoTodayOff)}
          className="ml-2"
        >
          {allDoTodayOff ? (
            <EyeOff className="mr-2 h-4 w-4" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          {allDoTodayOff ? 'Turn On All "Do Today"' : 'Turn Off All "Do Today"'}
        </Button>
      </div>

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        allCategories={allCategories}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        sections={sections}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createSection={createSection}
      />
    </div>
  );
};

export default DailyTasksHeader;