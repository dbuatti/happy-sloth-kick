"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks } from '@/hooks/useTasks'; // Corrected import
import { Task, TaskSection, TaskCategory } from '@/types/task'; // Corrected import
import TaskItem from '@/components/TaskItem';
import { useAuth } from '@/context/AuthContext';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client'; // Imported supabase

interface ArchivePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ isDemo, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || demoUserId;

  const {
    tasks: allTasks, // All tasks for subtask filtering in overview
    filteredTasks: archivedTasks,
    loading: archiveLoading,
    handleUpdateTask: updateTask,
    handleDeleteTask: deleteTask,
    sections,
    categories: allCategories,
    setStatusFilter, // To ensure only archived tasks are fetched
    bulkUpdateTasks,
  } = useTasks({ viewMode: 'archive', userId: currentUserId, currentDate: new Date() });

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setStatusFilter('archived'); // Ensure only archived tasks are fetched for this page
    return () => setStatusFilter('all'); // Reset filter when leaving page
  }, [setStatusFilter]);

  const handleOpenTaskOverview = (task: Task) => {
    setSelectedTask(task);
    setIsOverviewOpen(true);
  };

  const handleCloseTaskOverview = () => {
    setSelectedTask(null);
    setIsOverviewOpen(false);
  };

  const handleRestoreAllArchived = async () => {
    const archivedTaskIds = archivedTasks.map(task => task.id);
    if (archivedTaskIds.length > 0) {
      await bulkUpdateTasks(archivedTaskIds, { status: 'to-do' });
      showSuccess("All archived tasks restored!");
    } else {
      showError("No tasks to restore.");
    }
  };

  const handleConfirmBulkDelete = () => {
    setIsBulkDeleteConfirmOpen(true);
  };

  const handleBulkDeleteArchived = async () => {
    if (!currentUserId) {
      showError("User not authenticated.");
      return;
    }
    const archivedTaskIds = archivedTasks.map(task => task.id);
    if (archivedTaskIds.length > 0) {
      // Supabase delete with .in()
      const { error } = await supabase.from('tasks').delete().in('id', archivedTaskIds).eq('user_id', currentUserId);
      if (error) {
        showError("Failed to delete all archived tasks.");
        console.error("Error bulk deleting archived tasks:", error);
      } else {
        showSuccess("All archived tasks permanently deleted!");
      }
    } else {
      showError("No tasks to delete.");
    }
    setIsBulkDeleteConfirmOpen(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Archive</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={handleRestoreAllArchived}
            disabled={archivedTasks.length === 0 || archiveLoading}
          >
            <ArchiveRestore className="h-4 w-4 mr-2" /> Restore All
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmBulkDelete}
            disabled={archivedTasks.length === 0 || archiveLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete All
          </Button>
        </div>
      </div>

      {archiveLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          {archivedTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Your archive is empty. No tasks here!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {archivedTasks.map((task: Task) => (
                <li key={task.id} className="relative rounded-xl p-2 transition-all duration-200 ease-in-out group hover:shadow-md">
                  <TaskItem
                    task={task}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                    allTasks={allTasks}
                    sections={sections}
                    categories={allCategories}
                    onOpenTaskDetail={handleOpenTaskOverview}
                    showDoTodayToggle={false} // No "Do Today" in archive
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selectedTask && (
        <TaskOverviewDialog
          isOpen={isOverviewOpen}
          onClose={handleCloseTaskOverview}
          task={selectedTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          allTasks={allTasks}
          sections={sections}
          categories={allCategories}
        />
      )}

      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete All Archived Tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all {archivedTasks.length} archived tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteArchived} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivePage;