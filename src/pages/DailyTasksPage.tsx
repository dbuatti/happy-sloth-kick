import React, { useState, useRef, useEffect } from 'react';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings } = useSettings({ userId: demoUserId });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const taskListRef = useRef<any>(null);

  const {
    tasks,
    processedTasks,
    filteredTasks,
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
    nextAvailableTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ currentDate, userId: demoUserId });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useRef(new Map<string, Appointment>());

  useEffect(() => {
    scheduledTasksMap.current.clear();
    allAppointments.forEach(app => {
      if (app.task_id) {
        scheduledTasksMap.current.set(app.task_id, app);
      }
    });
  }, [allAppointments]);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === undefined ? false : !prev[sectionId],
    }));
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  };

  const toggleAllSections = () => {
    const allExpanded = Object.values(expandedSections).every(val => val === true);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = !allExpanded;
    });
    newExpandedState['no-section-header'] = !allExpanded; // Also toggle 'No Section'
    setExpandedSections(newExpandedState);
  };

  const shortcuts = {
    'cmd+n': () => setIsAddTaskOpen(true),
    'cmd+f': () => setIsFocusPanelOpen(true),
    'cmd+left': () => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1))),
    'cmd+right': () => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1))),
    'cmd+t': () => setCurrentDate(new Date()),
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <main className="flex-1 overflow-y-auto container mx-auto max-w-4xl">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        sections={sections}
        allCategories={allCategories}
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
      />

      <div className="p-4">
        <TaskList
          ref={taskListRef}
          tasks={tasks}
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
          setCurrentDate={setCurrentDate}
          expandedSections={expandedSections}
          expandedTasks={expandedTasks}
          toggleTask={toggleTask}
          toggleSection={toggleSection}
          toggleAllSections={toggleAllSections}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap.current}
          isDemo={isDemo}
        />
      </div>

      <FloatingAddTaskButton onClick={() => setIsAddTaskOpen(true)} isDemo={isDemo} />

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
        allTasks={tasks}
      />

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={tasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenTaskOverview}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
      />
    </main>
  );
};

export default DailyTasksPage;