import React, { useState, useCallback, useMemo } from 'react';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, startOfDay } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent } from "@/components/ui/card";
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AddTaskForm from '@/components/AddTaskForm';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { AnimatePresence } from 'framer-motion';
import { useSound } from '@/context/SoundContext';


interface DailyTasksV3Props {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksV3: React.FC<DailyTasksV3Props> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const { playSound } = useSound();

  // Manage currentDate state locally in DailyTasksV3
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
    // currentDate is now managed here, so remove from useTasks destructuring
    // setCurrentDate is also managed here
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ viewMode: 'daily', userId: demoUserId, currentDate: currentDate }); // Pass the stable currentDate

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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedSections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedTasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [sectionId]: !(prev[sectionId] ?? true) };
      localStorage.setItem('taskList_expandedSections', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const newState = { ...prev, [taskId]: !(prev[taskId] ?? true) };
      localStorage.setItem('taskList_expandedTasks', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const toggleAllSections = useCallback(() => {
    const allExpanded = Object.values(expandedSections).every(val => val === true);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = !allExpanded;
    });
    newExpandedState['no-section-header'] = !allExpanded;

    setExpandedSections(newExpandedState);
    localStorage.setItem('taskList_expandedSections', JSON.stringify(newExpandedState));
  }, [expandedSections, sections]);


  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    handleOpenDetail(task);
  };

  const handleOpenFocusView = () => {
    if (nextAvailableTask) {
      setIsFocusViewOpen(true);
    }
  };

  const handleMarkDoneFromFocusView = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      playSound('success');
    }
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': () => setCurrentDate(prevDate => startOfDay(addDays(prevDate, -1))),
    'arrowright': () => setCurrentDate(prevDate => startOfDay(addDays(prevDate, 1))),
    't': () => setCurrentDate(startOfDay(new Date())),
    '/': (e) => { e.preventDefault(); },
    'cmd+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow">
        <div className="w-full max-w-4xl mx-auto flex flex-col">
          <DailyTasksHeader
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            tasks={tasks}
            filteredTasks={filteredTasks}
            sections={sections}
            allCategories={allCategories}
            handleAddTask={handleAddTask}
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
            nextAvailableTask={nextAvailableTask}
            updateTask={updateTask}
            onOpenOverview={handleOpenOverview}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            doTodayOffIds={doTodayOffIds}
            archiveAllCompletedTasks={archiveAllCompletedTasks}
            toggleAllDoToday={toggleAllDoToday}
            setIsAddTaskDialogOpen={setIsAddTaskDialogOpen}
            setPrefilledTaskData={setPrefilledTaskData}
            dailyProgress={dailyProgress}
            isDemo={isDemo}
            toggleDoToday={toggleDoToday}
            onOpenFocusView={handleOpenFocusView}
          />

          <Card className="flex-1 flex flex-col rounded-none shadow-none border-0 relative z-[1]">
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <TaskList
                  tasks={tasks}
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
                  setCurrentDate={setCurrentDate} // Pass setCurrentDate to TaskList
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                  toggleAllSections={toggleAllSections}
                  expandedTasks={expandedTasks}
                  toggleTask={toggleTask}
                  setFocusTask={setFocusTask}
                  doTodayOffIds={doTodayOffIds}
                  toggleDoToday={toggleDoToday}
                  scheduledTasksMap={scheduledTasksMap}
                  isDemo={isDemo}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4 relative z-[0]">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      <CommandPalette
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
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
          allTasks={tasks}
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
          allTasks={tasks} {/* Added allTasks prop */}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={tasks}
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
          <AddTaskForm
            onAddTask={async (taskData) => {
              const success = await handleAddTask(taskData);
              if (success) {
                setIsAddTaskDialogOpen(false);
                setPrefilledTaskData(null);
              }
              return success;
            }}
            onTaskAdded={() => {
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

export default DailyTasksV3;