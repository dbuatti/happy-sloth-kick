import React, { useState } from 'react';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { NewTaskData } from '@/hooks/useTasks';

interface ArchivePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="flex flex-col h-full w-full">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        sections={[]}
        allCategories={[]}
        userId={demoUserId || null}
        createSection={async () => {}}
        updateSection={async () => {}}
        deleteSection={async () => {}}
        updateSectionIncludeInFocusMode={async () => {}}
        createCategory={async () => null}
        updateCategory={async () => false}
        deleteCategory={async () => false}
        archiveAllCompletedTasks={async () => {}}
        toggleAllDoToday={async () => {}}
        dailyProgress={{
          totalPendingCount: 0,
          completedCount: 0,
          overdueCount: 0,
        }}
        isDemo={isDemo}
        nextAvailableTask={null}
        updateTask={async () => null}
        onOpenOverview={() => {}}
        onOpenFocusView={() => {}}
        tasksLoading={false}
        onToggleAllSections={() => {}}
        isManageCategoriesOpen={false}
        setIsManageCategoriesOpen={() => {}}
        isManageSectionsOpen={false}
        setIsManageSectionsOpen={() => {}}
        isFilterPanelOpen={false}
        toggleFilterPanel={() => {}}
        markAllTasksAsCompleted={async () => {}}
        onOpenAddTaskDialog={() => {}}
        handleAddTask={async (taskData: NewTaskData) => {
          console.warn("Task creation is not supported on the Archive page.", taskData);
          return null;
        }}
        selectedCount={0}
        isSelectAllChecked={false}
        onToggleSelectAll={() => {}}
        hideQuickAddTask={true}
        hideDailyOverview={true}
      />
      {/* Content specific to the Archive page */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Archived Tasks</h2>
        {/* Render archived tasks here */}
        <p className="text-muted-foreground">This is where your archived tasks would be displayed.</p>
      </div>
    </div>
  );
};

export default ArchivePage;