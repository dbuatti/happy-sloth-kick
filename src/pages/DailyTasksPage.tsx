import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useSettings } from '@/context/SettingsContext';
import { useAppointments } from '@/hooks/useAppointments';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import BulkActionBar from '@/components/BulkActionBar';
import { toast } from 'sonner';
import { showSuccess } from '@/utils/toast';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string | null; // Updated to accept null
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id || null;
  const { settings, loading: settingsLoading } = useSettings();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('to-do');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const {
    tasks,
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    markAllTasksInSectionCompleted,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    allCategories,
    expandedSections,
    expandedTasks,
    toggleTask,
    toggleSection,
    toggleAllSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    dailyProgress,
    nextAvailableTask,
    archiveAllCompletedTasks,
    toggleAllDoToday,
  } = useTasks({
    currentDate,
    userId,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    futureTasksDaysVisible: settings?.future_tasks_days_visible,
    focusedTaskId: settings?.focused_task_id,
  });

  const { appointments, loading: appointmentsLoading } = useAppointments({ startDate: currentDate, endDate: currentDate });
  const scheduledTasksMap = new Map(appointments.filter(app => app.task_id).map(app => [app.task_id!, app]));

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isFullScreenFocusViewOpen, setIsFullScreenFocusViewOpen] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const taskListRef = useRef<any>(null);

  const handleOpenOverview = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  }, []);

  const handleOpenFocusView = useCallback(() => {
    if (nextAvailableTask) {
      setIsFullScreenFocusViewOpen(true);
    } else {
      toast.info("No task to focus on. Add a task or set one as 'Do Today'.");
    }
  }, [nextAvailableTask]);

  const handleMarkFocusTaskDone = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocusViewOpen(false);
      showSuccess('Task completed!');
    }
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBulkComplete = async () => {
    if (selectedTaskIds.size > 0) {
      await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTaskIds));
      handleClearSelection();
      showSuccess(`${selectedTaskIds.size} tasks marked complete!`);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTaskIds.size > 0) {
      await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTaskIds));
      handleClearSelection();
      showSuccess(`${selectedTaskIds.size} tasks archived!`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size > 0) {
      const success = await bulkDeleteTasks(Array.from(selectedTaskIds));
      if (success) {
        handleClearSelection();
        showSuccess(`${selectedTaskIds.size} tasks deleted!`);
      }
    }
  };

  const handleBulkChangePriority = async (priority: Task['priority']) => {
    if (selectedTaskIds.size > 0) {
      await bulkUpdateTasks({ priority }, Array.from(selectedTaskIds));
      handleClearSelection();
      showSuccess(`Priority updated for ${selectedTaskIds.size} tasks!`);
    }
  };

  if (settingsLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        tasks={tasks}
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
        onOpenOverview={handleOpenOverview}
        onOpenFocusView={handleOpenFocusView}
        tasksLoading={tasksLoading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={() => taskListRef.current?.toggleAllSections()}
        isManageCategoriesOpen={isManageCategoriesOpen}
        setIsManageCategoriesOpen={setIsManageCategoriesOpen}
        isManageSectionsOpen={isManageSectionsOpen}
        setIsManageSectionsOpen={setIsManageSectionsOpen}
      />

      <main className="flex-1 overflow-y-auto p-4">
        <TaskList
          ref={taskListRef}
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={tasksLoading || appointmentsLoading}
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
          onOpenOverview={handleOpenOverview}
          currentDate={currentDate}
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
      </main>

      <FloatingAddTaskButton onClick={() => handleAddTask({ description: '', category: allCategories[0]?.id || '', priority: 'medium', section_id: null })} isDemo={isDemo} />

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
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

      {isFullScreenFocusViewOpen && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description || 'No task description'}
          onClose={() => setIsFullScreenFocusViewOpen(false)}
          onMarkDone={handleMarkFocusTaskDone}
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