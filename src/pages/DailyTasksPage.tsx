import React, { useState, useRef, useMemo } from 'react';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import BulkActionBar from '@/components/BulkActionBar';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Appointment } from '@/hooks/useAppointments';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id || null;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToDetail, setTaskToDetail] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const {
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
  } = useTasks({ currentDate, userId, viewMode: 'daily' });

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

  const taskListRef = useRef<any>(null);

  const handleOpenAddTask = (sectionId: string | null = null) => {
    setTaskToDetail(null);
    setIsAddTaskOpen(true);
  };

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(null); // Close overview
    setTaskToDetail(task); // Open detail for editing
    setIsTaskDetailOpen(true);
  };

  const handleToggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
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

  const handleToggleAllSections = () => {
    if (taskListRef.current) {
      taskListRef.current.toggleAllSections();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        tasks={processedTasks}
        filteredTasks={filteredTasks}
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
        onToggleAllSections={handleToggleAllSections}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <TaskList
          ref={taskListRef}
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={loading}
          handleAddTask={handleAddTask}
          updateTask={updateTask}
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
          setIsAddTaskOpen={setIsAddTaskOpen}
          onOpenOverview={handleOpenTaskOverview}
          currentDate={currentDate}
          expandedSections={{}} // Manage expansion state locally if needed, or pass from parent
          expandedTasks={{}} // Manage expansion state locally if needed, or pass from parent
          toggleTask={() => {}} // Placeholder
          toggleSection={() => {}} // Placeholder
          toggleAllSections={handleToggleAllSections}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      </div>

      <FloatingAddTaskButton onClick={handleOpenAddTask} isDemo={isDemo} />

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

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}

      {taskToDetail && (
        <TaskDetailDialog
          task={taskToDetail}
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
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
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