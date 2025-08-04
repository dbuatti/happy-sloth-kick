import React, { useState, useCallback, useMemo } from 'react';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent } from "@/components/ui/card";
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AddTaskForm from '@/components/AddTaskForm';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';


const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const DailyTasksV3: React.FC = () => {
  const { user } = useAuth();

  const {
    tasks,
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
    currentDate,
    setCurrentDate,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ viewMode: 'daily' });

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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedSections');
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

  const shortcuts: ShortcutMap = {
    'arrowleft': () => setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, -1))),
    'arrowright': () => setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, 1))),
    't': () => setCurrentDate(getUTCStartOfDay(new Date())),
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
          />

          <Card className="p-3 flex-1 flex flex-col rounded-none shadow-none">
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto pt-3">
                <TaskList
                  tasks={tasks}
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
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                  toggleAllSections={toggleAllSections}
                  setFocusTask={setFocusTask}
                  doTodayOffIds={doTodayOffIds}
                  toggleDoToday={toggleDoToday}
                  scheduledTasksMap={scheduledTasksMap}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4">
        <MadeWithDyad />
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
    </div>
  );
};

export default DailyTasksV3;