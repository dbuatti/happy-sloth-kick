"use client";

import React, { useState, useRef, useCallback } from 'react';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useTasks, Task, NewTaskData, TaskSection, Category } from '@/hooks/useTasks'; // Added TaskSection, Category
import { useAuth } from '@/context/AuthContext';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TaskForm from '@/components/TaskForm';
import BulkActionBar from '@/components/BulkActionBar';
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
import { useSound } from '@/context/SoundContext';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments'; // Added Appointment import
import { Skeleton } from '@/components/ui/skeleton'; // Added Skeleton import

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId: string | null = demoUserId || user?.id || null; // Ensure userId is string | null

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isFullScreenFocusViewOpen, setIsFullScreenFocusViewOpen] = useState(false);

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);

  const isMobile = useIsMobile();
  const { playSound } = useSound();

  const taskListRef = useRef<any>(null);

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    markAllTasksInSectionCompleted,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    updateTaskParentAndOrder,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
    nextAvailableTask,
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
    archiveAllCompletedTasks,
  } = useTasks({ currentDate, userId, viewMode: 'daily' });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = React.useMemo(() => {
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

  const handleEditTask = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  }, []);

  const handleNewTaskSubmit = async (taskData: NewTaskData) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsTaskDetailOpen(false);
      playSound('success');
    }
    return success;
  };

  const handleMarkDoneFromFocusView = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      playSound('success');
      setIsFullScreenFocusViewOpen(false);
    }
  };

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => {
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
    setSelectedTasks(new Set());
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
      playSound('success');
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
      playSound('success');
    }
  };

  const handleBulkChangePriority = async (priority: Task['priority']) => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
      playSound('success');
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedTasks.size > 0) {
      setShowConfirmBulkDeleteDialog(true);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedTasks.size > 0) {
      await bulkDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
      setShowConfirmBulkDeleteDialog(false);
      playSound('alert');
    }
  };

  const handleToggleAllSections = () => {
    if (taskListRef.current) {
      taskListRef.current.toggleAllSections();
    }
  };

  const AddTaskDialogComponent = isMobile ? Sheet : Dialog;
  const AddTaskContentComponent = isMobile ? SheetContent : DialogContent;
  const AddTaskHeaderComponent = isMobile ? SheetHeader : DialogHeader;
  const AddTaskTitleComponent = isMobile ? SheetTitle : DialogTitle;
  const AddTaskDescriptionComponent = isMobile ? SheetDescription : DialogDescription;

  return (
    <div className="flex flex-col h-full">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        tasks={processedTasks} // Added tasks prop
        filteredTasks={filteredTasks} // Added filteredTasks prop
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
        onOpenFocusView={() => setIsFullScreenFocusViewOpen(true)}
        tasksLoading={loading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={handleToggleAllSections}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
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
          setIsAddTaskOpen={setIsTaskDetailOpen}
          onOpenOverview={handleOpenTaskOverview}
          currentDate={currentDate}
          expandedSections={{}} // Pass expandedSections state from parent if needed
          expandedTasks={{}} // Pass expandedTasks state from parent if needed
          toggleTask={() => {}} // Implement toggleTask logic if needed
          toggleSection={() => {}} // Implement toggleSection logic if needed
          toggleAllSections={handleToggleAllSections}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      </main>

      <FloatingAddTaskButton onClick={() => setIsTaskDetailOpen(true)} isDemo={isDemo} />

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

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTask}
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

      <AddTaskDialogComponent open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <AddTaskContentComponent className="sm:max-w-md">
          <AddTaskHeaderComponent>
            <AddTaskTitleComponent>{taskToEdit ? 'Edit Task' : 'Add New Task'}</AddTaskTitleComponent>
            <AddTaskDescriptionComponent className="sr-only">
              {taskToEdit ? 'Edit the details of your task.' : 'Fill in the details to add a new task.'}
            </AddTaskDescriptionComponent>
          </AddTaskHeaderComponent>
          <TaskForm
            initialData={taskToEdit}
            onSave={handleNewTaskSubmit}
            onCancel={() => setIsTaskDetailOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={processedTasks}
          />
        </AddTaskContentComponent>
      </AddTaskDialogComponent>

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleEditTask}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
      />

      {isFullScreenFocusViewOpen && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocusViewOpen(false)}
          onMarkDone={handleMarkDoneFromFocusView}
        />
      )}

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
            <AlertDialogAction onClick={confirmBulkDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailyTasksPage;