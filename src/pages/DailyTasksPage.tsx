import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskForm from '@/components/TaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { useAuth } from '@/context/AuthContext';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<any>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

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
  } = useTasks({ currentDate, viewMode: 'daily', userId });

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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('expandedSections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('expandedTasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('expandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  useEffect(() => {
    localStorage.setItem('expandedTasks', JSON.stringify(expandedTasks));
  }, [expandedTasks]);

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

  const toggleAllSections = () => {
    const allCollapsed = Object.values(expandedSections).every(val => val === false);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = allCollapsed;
    });
    newExpandedState['no-section-header'] = allCollapsed;
    setExpandedSections(newExpandedState);
  };

  const handleOpenOverview = (task: any) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleOpenFocusView = () => {
    setIsFocusPanelOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
        tasksLoading={loading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={toggleAllSections}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="w-full max-w-4xl mx-auto flex flex-col h-full"> {/* Added h-full here */}
          <TaskList
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
            onOpenOverview={handleOpenOverview}
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
            userId={userId} // Pass userId to TaskList
          />
        </div>
      </div>

      <FloatingAddTaskButton onClick={() => setIsAddTaskOpen(true)} isDemo={isDemo} />

      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details to add a new task.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSave={async (taskData) => {
              const success = await handleAddTask(taskData);
              if (success) setIsAddTaskOpen(false);
              return success;
            }}
            onCancel={() => setIsAddTaskOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            autoFocus
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={tasks}
          />
        </DialogContent>
      </Dialog>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenOverview} // Re-open form in edit mode
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={tasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenOverview}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
      />
    </div>
  );
};

export default DailyTasksPage;