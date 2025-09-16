"use client";

import React, { useState, useCallback, useMemo, useRef } from 'react';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks'; // Removed TaskSection
import { useAuth } from '@/context/AuthContext';
import { addDays, startOfDay } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent } from "@/components/ui/card";
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import TaskForm from '@/components/TaskForm';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { AnimatePresence } from 'framer-motion';
import { useSound } from '@/context/SoundContext';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton'; // Import the new FAB

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const { playSound } = useSound();

  // Manage currentDate state locally in DailyTasksPage
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
    tasks,
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    updateTask,
    deleteTask,
    loading: tasksLoading,
    sections,
    allCategories,
    handleAddTask,
    bulkUpdateTasks,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    updateTaskParentAndOrder,
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
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ viewMode: 'daily', userId: demoUserId, currentDate: currentDate });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    if (allAppointments) {
        allAppointments.forEach(app => {
            if (app.task_id) {
                map.set(app.task_id, app);
            }
        });
    }
    return map;
  }, [allAppointments]);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);

  // We need a ref to TaskList to call its internal toggleAllSections
  const taskListRef = useRef<any>(null);

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleOpenDetail = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setIsTaskOverviewOpen(false);
    handleOpenDetail(task);
  }, [handleOpenDetail]);

  const onOpenFocusView = useCallback(() => {
    if (nextAvailableTask) {
      setIsFocusViewOpen(true);
    }
  }, [nextAvailableTask]);

  const handleMarkDoneFromFocusView = useCallback(async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      playSound('success');
    }
  }, [nextAvailableTask, updateTask, playSound]);

  const handleToggleAllSectionsFromHeader = useCallback(() => {
    if (taskListRef.current && taskListRef.current.toggleAllSections) {
      taskListRef.current.toggleAllSections();
    }
  }, []);

  const shortcuts: ShortcutMap = {
    'arrowleft': () => setCurrentDate(prevDate => startOfDay(addDays(prevDate, -1))),
    'arrowright': () => setCurrentDate(prevDate => startOfDay(addDays(prevDate, 1))),
    't': () => setCurrentDate(startOfDay(new Date())),
    '/': (e) => { e.preventDefault(); },
    'cmd+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex-1 flex flex-col h-full">
      <main className="flex-grow"> {/* Removed overflow-y-auto from main */}
        <div className="w-full max-w-4xl mx-auto flex flex-col h-full"> {/* Added h-full here */}
          <DailyTasksHeader
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            tasks={tasks as Task[]}
            filteredTasks={filteredTasks}
            sections={sections}
            allCategories={allCategories}
            userId={user?.id || null}
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
            onOpenFocusView={onOpenFocusView}
            tasksLoading={tasksLoading}
            doTodayOffIds={doTodayOffIds} // Pass doTodayOffIds
            toggleDoToday={toggleDoToday} // Pass toggleDoToday
            onToggleAllSections={handleToggleAllSectionsFromHeader} // Pass the new handler
          />

          <Card className="flex-1 flex flex-col rounded-none shadow-none border-0 relative z-[1]">
            <CardContent className="p-4 flex-1 flex flex-col overflow-y-auto"> {/* Added overflow-y-auto here */}
              <div className="flex-1">
                <TaskList
                  ref={taskListRef} // Attach ref here
                  tasks={tasks as Task[]}
                  processedTasks={processedTasks}
                  filteredTasks={filteredTasks}
                  loading={tasksLoading}
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
                  setIsAddTaskOpen={() => {}}
                  onOpenOverview={handleOpenOverview}
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  setFocusTask={setFocusTask}
                  doTodayOffIds={doTodayOffIds}
                  toggleDoToday={toggleDoToday}
                  scheduledTasksMap={scheduledTasksMap}
                  isDemo={isDemo}
                  // QuickAddTask is removed from here
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4 relative z-[0]">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      <FloatingAddTaskButton onClick={() => setIsAddTaskDialogOpen(true)} isDemo={isDemo} />

      <CommandPalette
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
      />

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => {
            setIsTaskOverviewOpen(false);
            setTaskToOverview(null);
          }}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks as Task[]}
        />
      )}

      {taskToEdit && (
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
          allTasks={tasks as Task[]}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={tasks as Task[]}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        onOpenDetail={handleOpenDetail}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
      />

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details to add a new task.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSave={async (taskData) => {
              const success = await handleAddTask({
                ...taskData,
                section_id: prefilledTaskData?.section_id ?? null,
              });
              if (success) {
                setIsAddTaskDialogOpen(false);
                setPrefilledTaskData(null);
              }
              return success;
            }}
            onCancel={() => {
              setIsAddTaskDialogOpen(false);
              setPrefilledTaskData(null);
            }}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            initialData={prefilledTaskData as Task | null}
          />
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {isFocusViewOpen && nextAvailableTask && (
          <FullScreenFocusView
            taskDescription={nextAvailableTask.description || ''} // Ensure description is string
            onClose={() => setIsFocusViewOpen(false)}
            onMarkDone={handleMarkDoneFromFocusView}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyTasksPage;