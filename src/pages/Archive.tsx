import React, { useState, useRef, useEffect } from 'react';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { Archive as ArchiveIcon, ListTodo } from 'lucide-react';
import TaskFilter from '@/components/TaskFilter';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/context/AuthContext';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date()); // Archive view doesn't change date
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    tasks,
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask, // Not directly used in archive, but passed to TaskList
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
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'archive', userId: demoUserId });

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

  const shortcuts = {
    'cmd+n': () => {}, // Disable add task shortcut in archive
    'cmd+left': () => {},
    'cmd+right': () => {},
    'cmd+t': () => {},
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ArchiveIcon className="h-7 w-7 text-primary" /> Archived Tasks
        </h1>
      </div>

      <TaskFilter
        currentDate={currentDate}
        setCurrentDate={() => {}} // No date navigation in archive
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
        searchRef={searchInputRef}
      />

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
            <ListTodo className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No archived tasks found.</p>
            <p className="text-sm">Your archived tasks will appear here.</p>
          </div>
        ) : (
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
            setIsAddTaskOpen={() => {}} // No add task button in archive
            onOpenOverview={handleOpenTaskOverview}
            currentDate={currentDate}
            setCurrentDate={() => {}}
            expandedSections={{}} // No section expansion in archive
            expandedTasks={{}} // No task expansion in archive
            toggleTask={() => {}}
            toggleSection={() => {}}
            toggleAllSections={() => {}}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap.current}
            isDemo={isDemo}
          />
        )}
      </div>

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
    </main>
  );
};

export default Archive;