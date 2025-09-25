import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive as ArchiveIcon } from 'lucide-react';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import TaskList from '@/components/TaskList';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToDetail, setTaskToDetail] = useState<Task | null>(null);

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    markAllTasksInSectionCompleted,
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
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, userId, viewMode: 'archive' });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !(prev[sectionId] ?? true) }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !(prev[taskId] ?? true) }));
  }, []);

  const toggleAllSections = useCallback(() => {
    const allCollapsed = Object.values(expandedSections).every(val => val === false);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = allCollapsed;
    );
    newExpandedState['no-section-header'] = allCollapsed;
    setExpandedSections(newExpandedState);
  }, [expandedSections, sections]);

  const handleOpenOverview = (task: Task) => {
    setTaskToDetail(task);
    setIsTaskOverviewOpen(true);
  };

  const handleCloseTaskDetail = () => {
    setIsTaskOverviewOpen(false);
    setTaskToDetail(null);
  };

  const handleDeleteClick = (taskId: string) => {
    deleteTask(taskId);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archived Tasks
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tasks that have been archived. You can restore or permanently delete them here.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
              <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No archived tasks.</p>
              <p className="text-sm">Tasks you archive will appear here.</p>
            </div>
          ) : (
            <TaskList
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
              scheduledTasksMap={new Map()} // No scheduled tasks in archive view
              isDemo={isDemo}
            />
          )}
        </CardContent>
      </Card>

      {taskToDetail && (
        <TaskOverviewDialog
          task={taskToDetail}
          isOpen={isTaskOverviewOpen}
          onClose={handleCloseTaskDetail}
          onEditClick={handleOpenOverview}
          onUpdate={updateTask}
          onDelete={handleDeleteClick}
          sections={sections}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default Archive;