import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import BulkActionBar from '@/components/BulkActionBar';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useSettings } from '@/context/SettingsContext';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const taskListRef = useRef<any>(null);

  const {
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
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
    nextAvailableTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ currentDate, userId: demoUserId });

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

  const toggleTaskExpansion = useCallback((taskId: string) => {
    // This state is managed internally by TaskList, no need for global state here
  }, []);

  const toggleSectionExpansion = useCallback((sectionId: string) => {
    // This state is managed internally by TaskList, no need for global state here
  }, []);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const result = await updateTask(taskId, updates);
    if (result) {
      // If the task being updated is the one in overview, update it
      if (taskToOverview && taskToOverview.id === taskId) {
        setTaskToOverview(prev => prev ? { ...prev, ...updates } : null);
      }
    }
    return result;
  }, [updateTask, taskToOverview]);

  const handleMarkDoneFromFocus = async () => {
    if (taskToOverview) {
      await handleUpdateTask(taskToOverview.id, { status: 'completed' });
      setIsFullScreenFocus(false);
      setFocusTask(null);
    }
  };

  const handleOpenFocusView = () => {
    if (nextAvailableTask) {
      setTaskToOverview(nextAvailableTask); // Ensure the full screen view shows the next available task
      setIsFullScreenFocus(true);
    }
  };

  const handleToggleSelectTask = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleBulkComplete = async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size > 0) {
      await bulkDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkChangePriority = async (priority: Task['priority']) => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleToggleAllSections = () => {
    if (taskListRef.current) {
      taskListRef.current.toggleAllSections();
    }
  };

  if (isFullScreenFocus && taskToOverview) {
    return (
      <FullScreenFocusView
        taskDescription={taskToOverview.description}
        onClose={() => setIsFullScreenFocus(false)}
        onMarkDone={handleMarkDoneFromFocus}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        tasks={processedTasks}
        filteredTasks={filteredTasks}
        sections={sections}
        allCategories={allCategories}
        userId={demoUserId || null}
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
        updateTask={handleUpdateTask}
        onOpenOverview={handleOpenTaskOverview}
        onOpenFocusView={handleOpenFocusView}
        tasksLoading={tasksLoading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={handleToggleAllSections}
        isManageCategoriesOpen={isManageCategoriesOpen}
        setIsManageCategoriesOpen={setIsManageCategoriesOpen}
        isManageSectionsOpen={isManageSectionsOpen}
        setIsManageSectionsOpen={setIsManageSectionsOpen}
      />

      <CardContent className="flex-1 p-4 md:p-6 overflow-y-auto">
        <TaskList
          ref={taskListRef}
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={tasksLoading}
          handleAddTask={handleAddTask}
          updateTask={handleUpdateTask}
          deleteTask={deleteTask}
          bulkUpdateTasks={bulkUpdateTasks}
          markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
          sections={sections}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          updateTaskParentAndOrder={updateTaskParentAndOrder}
          reorderSections={reorderSections}
          allCategories={allCategories}
          setIsAddTaskOpen={() => {}} // TaskList manages its own add task dialog
          onOpenOverview={handleOpenTaskOverview}
          currentDate={currentDate}
          expandedSections={{}} // TaskList manages its own expansion state
          expandedTasks={{}} // TaskList manages its own expansion state
          toggleTask={toggleTaskExpansion}
          toggleSection={toggleSectionExpansion}
          toggleAllSections={handleToggleAllSections}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      </CardContent>

      <FloatingAddTaskButton onClick={() => handleAddTask({ description: '', category: allCategories[0]?.id || '', section_id: null })} isDemo={isDemo} />

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={() => setSelectedTasks(new Set())}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      {taskToOverview && (
        <TaskDetailDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onUpdate={handleUpdateTask}
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
        updateTask={handleUpdateTask}
        onOpenDetail={handleOpenTaskOverview}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
        setFocusTask={setFocusTask}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
      />
    </div>
  );
};

export default DailyTasksPage;