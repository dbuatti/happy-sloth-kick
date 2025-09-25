import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useTasks, Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import BulkActionBar from '@/components/BulkActionBar';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Appointment } from '@/hooks/useAppointments'; // Added missing import
import { useAllAppointments } from '@/hooks/useAllAppointments'; // Added missing import
import DailyTasksHeader from '@/components/DailyTasksHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set()); // Fixed useState initialization
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);

  const taskListRef = useRef<any>(null);

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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !(prev[sectionId] ?? true)
    }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !(prev[taskId] ?? true)
    }));
  }, []);

  const toggleAllSections = useCallback(() => {
    const allSectionsAreExpanded = sections.every(s => expandedSections[s.id] ?? true);
    const newExpandedState = sections.reduce((acc, section) => {
      acc[section.id] = !allSectionsAreExpanded;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedSections(newExpandedState);
  }, [sections, expandedSections]);

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

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleNewTaskSubmit = useCallback(async (taskData: NewTaskData) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsAddTaskOpen(false);
    }
    return success;
  }, [handleAddTask]);

  const handleToggleSelectTask = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(taskId)) {
        newSelection.delete(taskId);
      } else {
        newSelection.add(taskId);
      }
      return newSelection;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkComplete = useCallback(async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  }, [selectedTasks, bulkUpdateTasks]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  }, [selectedTasks, bulkUpdateTasks]);

  const handleBulkChangePriority = useCallback(async (priority: Task['priority']) => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  }, [selectedTasks, bulkUpdateTasks]);

  const handleBulkDeleteClick = useCallback(() => {
    setShowConfirmBulkDeleteDialog(true);
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    if (selectedTasks.size > 0) {
      await bulkDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
      setShowConfirmBulkDeleteDialog(false);
    }
  }, [selectedTasks, bulkDeleteTasks]);

  return (
    <div className="flex-1 flex flex-col">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
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
        onToggleAllSections={toggleAllSections}
      />

      <CardContent className="p-4 lg:p-6">
        <TaskList
          ref={taskListRef}
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={loading}
          handleAddTask={handleNewTaskSubmit}
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
      </CardContent>

      <FloatingAddTaskButton onClick={() => setIsAddTaskOpen(true)} isDemo={isDemo} />

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDeleteClick}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
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

      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedTasks.size} selected tasks and all their sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailyTasksPage;