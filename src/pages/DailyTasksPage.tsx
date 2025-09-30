import React, { useState, useCallback, useMemo } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import BulkActionBar from '@/components/BulkActionBar';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import FilterPanel from '@/components/FilterPanel';
import DailyBriefingCard from '@/components/DailyBriefingCard';
import { getDailyBriefing } from '@/integrations/supabase/api';
import { useQuery } from '@tanstack/react-query';
import AddTaskDialog from '@/components/AddTaskDialog'; // Import the new dialog

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false); // State for AddTaskDialog
  const [preselectedParentTaskId, setPreselectedParentTaskId] = useState<string | null>(null); // New state for subtask parent
  const [preselectedSectionIdForSubtask, setPreselectedSectionIdForSubtask] = useState<string | null>(null); // New state for subtask section

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const {
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading: tasksLoading,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    sections,
    allCategories,
    updateTaskParentAndOrder,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted, // This is for a specific section, we need a general one
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({
    currentDate,
    userId: demoUserId,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
  });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach((app: Appointment) => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === undefined ? false : !prev[sectionId],
    }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  }, []);

  const toggleAllSections = useCallback(() => {
    const allCollapsed = Object.values(expandedSections).every(val => val === false);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = allCollapsed;
    });
    setExpandedSections(newExpandedState);
  }, [expandedSections, sections]);

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleOpenFocusView = useCallback(() => {
    setIsFocusPanelOpen(true);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const handleSelectTask = useCallback((taskId: string, isSelected: boolean) => {
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

  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(prev => !prev);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSectionFilter('all');
  }, []);

  // Fetch daily briefing
  const { data: dailyBriefing, isLoading: isBriefingLoading, isError: isBriefingError } = useQuery<string | null, Error>({
    queryKey: ['dailyBriefing', userId, currentDate.toISOString().split('T')[0]],
    queryFn: () => getDailyBriefing(userId as string, currentDate),
    enabled: !!userId && !isDemo,
    staleTime: 5 * 60 * 1000,
  });

  const openAddTaskDialog = useCallback((parentTaskId: string | null = null, sectionId: string | null = null) => {
    setPreselectedParentTaskId(parentTaskId);
    setPreselectedSectionIdForSubtask(sectionId);
    setIsAddTaskDialogOpen(true);
  }, []);

  const closeAddTaskDialog = useCallback(() => {
    setIsAddTaskDialogOpen(false);
    setPreselectedParentTaskId(null);
    setPreselectedSectionIdForSubtask(null);
  }, []);

  // New function to mark all pending tasks as completed (across all sections)
  const markAllPendingTasksAsCompleted = useCallback(async () => {
    const pendingTaskIds = processedTasks
      .filter(task => task.status === 'to-do' && task.parent_task_id === null) // Only top-level pending tasks
      .map(task => task.id);
    if (pendingTaskIds.length > 0) {
      await bulkUpdateTasks({ status: 'completed' }, pendingTaskIds);
    }
  }, [processedTasks, bulkUpdateTasks]);

  return (
    <div className="flex flex-col h-full w-full">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        tasks={processedTasks}
        filteredTasks={filteredTasks}
        sections={sections}
        allCategories={allCategories}
        userId={userId || null}
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
        onToggleAllSections={toggleAllSections}
        isManageCategoriesOpen={isManageCategoriesOpen}
        setIsManageCategoriesOpen={setIsManageCategoriesOpen}
        isManageSectionsOpen={setIsManageSectionsOpen}
        setIsManageSectionsOpen={setIsManageSectionsOpen}
        isFilterPanelOpen={isFilterPanelOpen}
        toggleFilterPanel={toggleFilterPanel}
        markAllTasksAsCompleted={markAllPendingTasksAsCompleted} // Pass to header for DailyOverviewCard
      />

      <FilterPanel
        isOpen={isFilterPanelOpen}
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
        onClearFilters={handleClearFilters}
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <DailyBriefingCard
          briefing={dailyBriefing ?? null}
          isLoading={isBriefingLoading}
          isError={isBriefingError}
        />
        <div className="mt-6">
          <TaskList
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={tasksLoading}
            handleAddTask={handleAddTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
            sections={sections}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            updateTaskParentAndOrder={updateTaskParentAndOrder}
            allCategories={allCategories}
            onOpenOverview={handleOpenOverview}
            currentDate={currentDate}
            expandedSections={expandedSections}
            expandedTasks={expandedTasks}
            toggleTask={toggleTask}
            toggleSection={toggleSection}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={handleSelectTask}
          />
        </div>
      </div>

      <FloatingAddTaskButton onClick={() => openAddTaskDialog()} isDemo={isDemo} />

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
          onAddSubtask={openAddTaskDialog}
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

      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onClose={closeAddTaskDialog}
        onSave={handleAddTask}
        sections={sections}
        allCategories={allCategories}
        currentDate={currentDate}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks}
        preselectedParentTaskId={preselectedParentTaskId}
        preselectedSectionId={preselectedSectionIdForSubtask}
      />
    </div>
  );
};

export default DailyTasksPage;