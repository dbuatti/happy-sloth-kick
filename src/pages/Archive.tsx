import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { Archive as ArchiveIcon } from 'lucide-react';
import BulkActionBar from '@/components/BulkActionBar';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const {
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'archive', userId: demoUserId });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = React.useMemo(() => {
    const map = new Map<string, any>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const toggleTaskExpansion = useCallback((taskId: string) => {
    // This state is managed internally by TaskList, no need for global state here
  }, []);

  const toggleSectionExpansion = useCallback((sectionId: string) => {
    // This state is managed internally by TaskList, no need for global state here
  }, []);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const result = await updateTask(taskId, updates);
    if (result) {
      if (taskToOverview && taskToOverview.id === taskId) {
        setTaskToOverview(prev => prev ? { ...prev, ...updates } : null);
      }
    }
    return result;
  }, [updateTask, taskToOverview]);

  const handleToggleSelectTask = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleBulkComplete = async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size > 0) {
      await bulkDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleBulkChangePriority = async (priority: Task['priority']) => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 overflow-auto">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archive
          </CardTitle>
          <p className="text-muted-foreground">Review and manage your archived tasks.</p>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
              <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Your archive is empty!</p>
              <p className="text-sm">No tasks have been archived yet.</p>
            </div>
          ) : (
            <TaskList
              processedTasks={processedTasks}
              filteredTasks={filteredTasks}
              loading={tasksLoading}
              handleAddTask={async () => { /* Not adding tasks directly in archive */ }}
              updateTask={handleUpdateTask}
              deleteTask={deleteTask}
              bulkUpdateTasks={bulkUpdateTasks}
              markAllTasksInSectionCompleted={markAllTasksInSectionInSectionCompleted}
              sections={sections}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              updateTaskParentAndOrder={updateTaskParentAndOrder}
              reorderSections={reorderSections}
              allCategories={allCategories}
              setIsAddTaskOpen={() => {}}
              onOpenOverview={handleOpenTaskOverview}
              currentDate={currentDate}
              expandedSections={{}}
              expandedTasks={{}}
              toggleTask={toggleTaskExpansion}
              toggleSection={toggleSectionExpansion}
              toggleAllSections={() => {}}
              setFocusTask={setFocusTask}
              doTodayOffIds={doTodayOffIds}
              toggleDoToday={toggleDoToday}
              scheduledTasksMap={scheduledTasksMap}
              isDemo={isDemo}
            />
          )}
        </CardContent>
      </Card>

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={() => setSelectedTasks(new Set())}
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
          onUpdate={handleUpdateTask}
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