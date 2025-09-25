import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive as ArchiveIcon, Trash2, Undo2 } from 'lucide-react';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import TaskFilter from '@/components/TaskFilter';
import TaskList from '@/components/TaskList';
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
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { Appointment } from '@/hooks/useAppointments';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id || null;
  const [currentDate] = useState(new Date()); // Needed for useTasks hook

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    processedTasks,
    filteredTasks,
    loading,
    updateTask,
    deleteTask,
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
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    handleAddTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, userId, viewMode: 'archive' });

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

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    // In archive view, we just want to open the overview, not directly edit.
    // The TaskOverviewDialog itself has an edit button that will open TaskDetailDialog.
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleRestoreTask = async (task: Task) => {
    await updateTask(task.id, { status: 'to-do' });
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete.id);
      setShowConfirmDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archived Tasks
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tasks that have been archived. You can restore or permanently delete them here.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <TaskFilter
            currentDate={currentDate}
            setCurrentDate={() => {}} // Not needed for archive view
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
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
              <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No archived tasks.</p>
              <p className="text-sm">Your archive is empty. Keep up the great work!</p>
            </div>
          ) : (
            <TaskList
              processedTasks={processedTasks}
              filteredTasks={filteredTasks}
              loading={loading}
              handleAddTask={handleAddTask}
              updateTask={updateTask}
              deleteTask={deleteTask}
              bulkUpdateTasks={() => {}} // Not directly used in archive list for bulk
              markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
              sections={sections}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              updateTaskParentAndOrder={updateTaskParentAndOrder}
              reorderSections={reorderSections}
              allCategories={allCategories}
              setIsAddTaskOpen={() => {}} // Not used here
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
              scheduledTasksMap={scheduledTasksMap}
              isDemo={isDemo}
            />
          )}
        </CardContent>
      </Card>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={handleDeleteClick}
          sections={sections}
          allTasks={processedTasks}
        />
      )}

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "{taskToDelete?.description}" and all its sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask}>Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;