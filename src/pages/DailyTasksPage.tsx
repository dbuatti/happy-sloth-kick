import React, { useState, useRef, useCallback } from 'react';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useTasks, Task, NewTaskData } from '@/hooks/useTasks';
import { useIsMobile } from '@/hooks/use-mobile';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import BulkActionBar from '@/components/BulkActionBar';
import { useSettings } from '@/context/SettingsContext';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { settings } = useSettings();

  const {
    tasks,
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
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
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ currentDate, viewMode: 'daily', userId: demoUserId });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = React.useMemo(() => {
    const map = new Map<string, any>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const taskListRef = useRef<any>(null);

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleToggleAllSections = useCallback(() => {
    if (taskListRef.current) {
      taskListRef.current.toggleAllSections();
    }
  }, []);

  const handleSelectTask = (taskId: string, isSelected: boolean) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBulkComplete = async () => {
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTaskIds));
    handleClearSelection();
  };

  const handleBulkArchive = async () => {
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTaskIds));
    handleClearSelection();
  };

  const handleBulkDelete = async () => {
    await bulkDeleteTasks(Array.from(selectedTaskIds));
    handleClearSelection();
  };

  const handleBulkChangePriority = async (priority: Task['priority']) => {
    await bulkUpdateTasks({ priority }, Array.from(selectedTaskIds));
    handleClearSelection();
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        tasks={tasks}
        filteredTasks={filteredTasks}
        sections={sections}
        allCategories={allCategories}
        userId={demoUserId}
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
        onOpenOverview={handleOpenOverview}
        onOpenFocusView={() => setIsFocusPanelOpen(true)}
        tasksLoading={loading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={handleToggleAllSections}
        isManageCategoriesOpen={isManageCategoriesOpen}
        setIsManageCategoriesOpen={setIsManageCategoriesOpen}
        isManageSectionsOpen={isManageSectionsOpen}
        setIsManageSectionsOpen={setIsManageSectionsOpen}
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <TaskList
          ref={taskListRef}
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={loading}
          handleAddTask={handleAddTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
          bulkUpdateTasks={bulkUpdateTasks}
          bulkDeleteTasks={bulkDeleteTasks} // Pass bulkDeleteTasks
          markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
          sections={sections}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          updateTaskParentAndOrder={updateTaskParentAndOrder}
          reorderSections={reorderSections}
          allCategories={allCategories}
          setIsAddTaskOpen={setIsAddTaskOpen}
          onOpenOverview={handleOpenOverview}
          currentDate={currentDate}
          expandedSections={settings?.expanded_sections || {}}
          expandedTasks={settings?.expanded_tasks || {}}
          toggleTask={(taskId) => updateSettings({ expanded_tasks: { ...settings?.expanded_tasks, [taskId]: !(settings?.expanded_tasks?.[taskId] ?? true) } })}
          toggleSection={(sectionId) => updateSettings({ expanded_sections: { ...settings?.expanded_sections, [sectionId]: !(settings?.expanded_sections?.[sectionId] ?? true) } })}
          toggleAllSections={handleToggleAllSections}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      </div>

      <FloatingAddTaskButton onClick={() => setIsAddTaskOpen(true)} isDemo={isDemo} />

      {isTaskOverviewOpen && taskToOverview && (
        <TaskDetailDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={processedTasks}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenOverview}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
        setFocusTask={setFocusTask}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
      />

      {selectedTaskIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTaskIds.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onChangePriority={handleBulkChangePriority}
        />
      )}
    </div>
  );
};

export default DailyTasksPage;