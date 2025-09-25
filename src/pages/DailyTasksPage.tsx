import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useTasks, Task, NewTaskData } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import BulkActionBar from '@/components/BulkActionBar';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { useAuth } from '@/context/AuthContext';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id || null; // Ensure userId is string | null

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const taskListRef = useRef<any>(null); // Ref for TaskList component

  const {
    tasks: rawTasks, // Renamed to rawTasks to avoid confusion with processedTasks
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading: tasksLoading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ currentDate, userId, searchFilter, statusFilter, categoryFilter, priorityFilter });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
    setIsTaskOverviewOpen(false); // Close overview if opening detail
  }, []);

  const handleOpenFocusView = useCallback(() => {
    setIsFocusPanelOpen(true);
  }, []);

  const handleToggleSelectTask = useCallback((taskId: string, isSelected: boolean) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const handleBulkComplete = useCallback(async () => {
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTaskIds));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTaskIds, handleClearSelection]);

  const handleBulkArchive = useCallback(async () => {
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTaskIds));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTaskIds, handleClearSelection]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDeleteTasks(Array.from(selectedTaskIds));
    handleClearSelection();
  }, [bulkDeleteTasks, selectedTaskIds, handleClearSelection]);

  const handleBulkChangePriority = useCallback(async (priority: Task['priority']) => {
    await bulkUpdateTasks({ priority }, Array.from(selectedTaskIds));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTaskIds, handleClearSelection]);

  const handleToggleAllSections = useCallback(() => {
    if (taskListRef.current) {
      taskListRef.current.toggleAllSections();
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        priorityFilter={setPriorityFilter}
        sections={sections}
        allCategories={allCategories}
        userId={userId}
        setIsFocusPanelOpen={setIsFocusPanelOpen}
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
        onOpenFocusView={handleOpenFocusView}
        tasksLoading={tasksLoading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={handleToggleAllSections}
        isManageCategoriesOpen={false} // Placeholder, actual state managed in header
        setIsManageCategoriesOpen={() => {}} // Placeholder
        isManageSectionsOpen={false} // Placeholder
        setIsManageSectionsOpen={() => {}} // Placeholder
      />

      <CardContent className="flex-1 p-4 overflow-y-auto">
        <TaskList
          ref={taskListRef}
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={tasksLoading}
          handleAddTask={handleAddTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
          bulkUpdateTasks={bulkUpdateTasks}
          bulkDeleteTasks={bulkDeleteTasks}
          markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
          sections={sections}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          updateTaskParentAndOrder={updateTaskParentAndOrder}
          reorderSections={reorderSections}
          allCategories={allCategories}
          setIsAddTaskOpen={() => {}} // Not used directly here, handled by FloatingAddTaskButton
          onOpenOverview={handleOpenTaskOverview}
          currentDate={currentDate}
          expandedSections={{}} // Managed internally by TaskList
          expandedTasks={{}} // Managed internally by TaskList
          toggleTask={() => {}} // Managed internally by TaskList
          toggleSection={() => {}} // Managed internally by TaskList
          toggleAllSections={handleToggleAllSections}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      </CardContent>

      <FloatingAddTaskButton onClick={() => handleAddTask({ description: '', category: allCategories[0]?.id || '', priority: 'medium' })} isDemo={isDemo} />

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

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskClick}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allTasks={processedTasks}
      />

      <TaskDetailDialog
        task={taskToEdit}
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
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

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        onOpenDetail={handleOpenTaskOverview}
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