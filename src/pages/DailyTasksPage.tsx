import React, { useState, useRef, useEffect, useMemo } from 'react'; // Added useMemo
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NewTaskData } from '@/hooks/useTasks'; // Import NewTaskData
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import ManageSectionsDialog from '@/components/ManageSectionsDialog';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings } = useSettings({ userId: demoUserId });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false); // Renamed to avoid conflict
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const taskListRef = useRef<any>(null); // Ref for TaskList component

  const {
    tasks, // rawTasks
    processedTasks, // tasks with category_color and virtual tasks
    filteredTasks,
    nextAvailableTask,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    // bulkDeleteTasks, // Removed as it's not used directly here
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
    sections,
    allCategories,
    updateTaskParentAndOrder,
    reorderSections,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ currentDate, userId: demoUserId });

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    // This will open the TaskForm for editing the task
    // For now, we'll just re-open the overview with the task,
    // as the TaskOverviewDialog itself contains the TaskForm.
    // If a separate TaskForm dialog is desired, it would be triggered here.
    handleOpenTaskOverview(task);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === false ? true : false, // Toggle logic
    }));
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === false ? true : false, // Toggle logic
    }));
  };

  const toggleAllSections = useCallback(() => {
    const allAreExpanded = sections.every(s => expandedSections[s.id] !== false);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(s => {
      newExpandedState[s.id] = !allAreExpanded;
    });
    setExpandedSections(newExpandedState);
  }, [sections, expandedSections]);

  const scheduledTasksMap = useMemo(() => {
    // This map is currently empty as useAppointments is not directly used here.
    // If scheduling is needed, useAppointments should be integrated.
    return new Map<string, any>();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        sections={sections}
        allCategories={allCategories}
        userId={userId}
        setIsFocusPanelOpen={setIsFocusPanelOpen}
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
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        archiveAllCompletedTasks={archiveAllCompletedTasks}
        toggleAllDoToday={toggleAllDoToday}
        dailyProgress={dailyProgress}
        isDemo={isDemo}
        nextAvailableTask={nextAvailableTask}
        updateTask={updateTask}
        onOpenOverview={handleOpenTaskOverview}
        onOpenFocusView={() => setIsFocusPanelOpen(true)}
        tasksLoading={loading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={toggleAllSections}
        tasks={processedTasks} // Pass processedTasks
        filteredTasks={filteredTasks} // Pass filteredTasks
      />

      <main className="flex-1 overflow-y-auto container mx-auto max-w-4xl p-4 lg:p-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 w-full rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <TaskList
            ref={taskListRef}
            tasks={processedTasks} // Use processedTasks
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={loading}
            handleAddTask={handleAddTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            bulkUpdateTasks={bulkUpdateTasks}
            markAllTasksInSectionCompleted={markAllTasksInSectionInSectionCompleted}
            sections={sections}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            updateTaskParentAndOrder={updateTaskParentAndOrder}
            reorderSections={reorderSections}
            allCategories={allCategories}
            setIsAddTaskOpen={setIsAddTaskDialogOpen}
            onOpenOverview={handleOpenTaskOverview}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            expandedSections={expandedSections}
            expandedTasks={expandedTasks}
            toggleTask={toggleTask}
            toggleSection={toggleSection}
            toggleAllSections={toggleAllSections}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
          />
        )}
      </main>

      <FloatingAddTaskButton onClick={() => setIsAddTaskDialogOpen(true)} isDemo={isDemo} />

      <TaskDetailDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskFromOverview}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks} // Pass processedTasks
      />

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={processedTasks} // Pass processedTasks
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={onOpenDetail}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
      />

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={allCategories}
        onCategoryCreated={() => {}} // No-op, useTasks handles invalidation
        onCategoryDeleted={() => {}} // No-op, useTasks handles invalidation
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

export default DailyTasksPage;