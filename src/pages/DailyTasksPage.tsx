import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import BulkActionBar from '@/components/BulkActionBar';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments'; // Import Appointment type
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const taskListRef = useRef<any>(null);

  const {
    processedTasks,
    filteredTasks,
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
    reorderSections,
    loading: tasksLoading,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    nextAvailableTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ currentDate, userId: demoUserId });

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

  const handleOpenTaskEdit = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskOverviewOpen(false); // Close overview if open
  }, []);

  const handleCloseTaskEdit = useCallback(() => {
    setTaskToEdit(null);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const result = await updateTask(taskId, updates);
    if (result) {
      // If the task being edited is the one in overview, update it
      if (taskToOverview && taskToOverview.id === taskId) {
        setTaskToOverview(prev => prev ? { ...prev, ...updates } : null);
      }
      // If the task being edited is the one in edit dialog, update it
      if (taskToEdit && taskToEdit.id === taskId) {
        setTaskToEdit(prev => prev ? { ...prev, ...updates } : null);
      }
    }
    return result;
  }, [updateTask, taskToOverview, taskToEdit]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    if (taskToOverview?.id === taskId) {
      setIsTaskOverviewOpen(false);
      setTaskToOverview(null);
    }
    if (taskToEdit?.id === taskId) {
      setTaskToEdit(null);
    }
  }, [deleteTask, taskToOverview, taskToEdit]);

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

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkComplete = useCallback(async () => {
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkArchive = useCallback(async () => {
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDeleteTasks(Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkDeleteTasks, selectedTasks, handleClearSelection]);

  const handleBulkChangePriority = useCallback(async (priority: Task['priority']) => {
    await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleToggleAllSections = useCallback(() => {
    if (taskListRef.current) {
      taskListRef.current.toggleAllSections();
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        tasks={processedTasks}
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
        updateTask={handleUpdateTask}
        onOpenOverview={handleOpenTaskOverview}
        onOpenFocusView={() => setIsFocusPanelOpen(true)}
        tasksLoading={tasksLoading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={handleToggleAllSections}
      />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Your Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList
              ref={taskListRef}
              processedTasks={processedTasks}
              filteredTasks={filteredTasks}
              loading={tasksLoading}
              handleAddTask={handleAddTask}
              updateTask={handleUpdateTask}
              deleteTask={handleDeleteTask}
              bulkUpdateTasks={bulkUpdateTasks}
              sections={sections}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              updateTaskParentAndOrder={updateTaskParentAndOrder}
              reorderSections={reorderSections}
              allCategories={allCategories}
              setIsAddTaskOpen={setIsAddTaskOpen}
              onOpenOverview={handleOpenTaskOverview}
              currentDate={currentDate}
              expandedSections={{}} // Pass empty object for now, or manage state
              expandedTasks={{}} // Pass empty object for now, or manage state
              toggleTask={() => {}} // Placeholder
              toggleSection={() => {}} // Placeholder
              toggleAllSections={handleToggleAllSections}
              setFocusTask={setFocusTask}
              doTodayOffIds={doTodayOffIds}
              toggleDoToday={toggleDoToday}
              scheduledTasksMap={scheduledTasksMap}
              isDemo={isDemo}
              markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
            />
          </CardContent>
        </Card>
      </div>

      <FloatingAddTaskButton onClick={() => setIsAddTaskOpen(true)} isDemo={isDemo} />

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskEdit}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={!!taskToEdit}
          onClose={handleCloseTaskEdit}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
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
        onDeleteTask={handleDeleteTask}
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