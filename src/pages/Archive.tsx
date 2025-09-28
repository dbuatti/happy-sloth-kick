import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskFilter from '@/components/TaskFilter';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import BulkActionBar from '@/components/BulkActionBar';
import { Archive as ArchiveIcon, ListTodo } from 'lucide-react';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date()); // Archive view doesn't change date

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('archived'); // Default to archived
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const {
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
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
  } = useTasks({
    currentDate,
    viewMode: 'archive',
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
    allAppointments.forEach(app => {
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

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
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

  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="max-w-full mx-auto space-y-6">
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              <ArchiveIcon className="h-6 w-6 text-primary" /> Archived Tasks
            </CardTitle>
            <p className="text-muted-foreground">Review and manage your archived tasks.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <TaskFilter
              currentDate={currentDate}
              setCurrentDate={() => {}} // Not applicable for archive view
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
            {filteredTasks.length === 0 && !tasksLoading ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <ListTodo className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No archived tasks found.</p>
                <p className="text-sm">Your archived tasks will appear here.</p>
              </div>
            ) : (
              <TaskList
                processedTasks={processedTasks}
                filteredTasks={filteredTasks}
                loading={tasksLoading}
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
                setIsAddTaskOpen={() => {}}
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
            )}
          </CardContent>
        </Card>
      </div>

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
        />
      )}
    </div>
  );
};

export default Archive;