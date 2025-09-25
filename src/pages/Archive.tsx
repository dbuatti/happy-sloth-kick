import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskFilter from '@/components/TaskFilter';
import TaskList from '@/components/TaskList';
import { Archive as ArchiveIcon, ListTodo } from 'lucide-react';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog
import TaskDetailDialog from '@/components/TaskDetailDialog'; // Import TaskDetailDialog
import BulkActionBar from '@/components/BulkActionBar';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date()); // Current date is not directly used for filtering in archive, but needed for useTasks hook
  const searchInputRef = useRef<HTMLInputElement>(null); // Added useRef for search input

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const {
    processedTasks,
    filteredTasks,
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
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'archive', userId: demoUserId });

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskDialogOpen(true);
    setIsTaskOverviewOpen(false); // Close overview if opening edit
  }, []);

  const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
    const result = await updateTask(taskId, updates);
    if (result) {
      setIsEditTaskDialogOpen(false);
      setTaskToEdit(null);
    }
    return result;
  };

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

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkComplete = useCallback(async () => {
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkArchive = useCallback(async () => {
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDeleteTasks(Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkDeleteTasks, selectedTasks, handleClearSelection]);

  const handleBulkChangePriority = useCallback(async (priority: Task['priority']) => {
    await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archived Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
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

          {loading ? (
            <div className="space-y-3 mt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 w-full bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
              <ListTodo className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No archived tasks found.</p>
              <p className="text-sm">Your archive is empty, or no tasks match the current filters.</p>
            </div>
          ) : (
            <div className="mt-4">
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
                onOpenOverview={handleOpenTaskOverview}
                currentDate={currentDate}
                expandedSections={{}}
                expandedTasks={{}}
                toggleTask={() => {}}
                toggleSection={() => {}}
                toggleAllSections={() => {}}
                setFocusTask={setFocusTask}
                doTodayOffIds={doTodayOffIds}
                toggleDoToday={toggleDoToday}
                scheduledTasksMap={new Map()} // No scheduled tasks in archive view
                isDemo={isDemo}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskClick}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allTasks={processedTasks}
      />

      <TaskDetailDialog
        task={taskToEdit}
        isOpen={isEditTaskDialogOpen}
        onClose={() => setIsEditTaskDialogOpen(false)}
        onUpdate={handleSaveTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks}
      />
    </div>
  );
};

export default Archive;