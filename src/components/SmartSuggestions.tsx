import React, { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Clock, CheckCircle2, ListTodo, Plus } from 'lucide-react';
import { Task } from '@/hooks/useTasks'; // Import Task type
import { isPast, isToday, format, isSameDay } from 'date-fns';
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

interface SmartSuggestionsProps {
  tasks: Task[]; // Now receives filtered tasks
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  bulkUpdateTasks: (updates: Partial<Task>, ids?: string[]) => Promise<void>; // Add bulkUpdateTasks
  clearSelectedTasks: () => void; // Add clearSelectedTasks
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ tasks, currentDate, setCurrentDate, bulkUpdateTasks, clearSelectedTasks }) => {
  const [showConfirmArchiveDialog, setShowConfirmArchiveDialog] = useState(false);

  const {
    completedTasksToday,
    totalTasksToday,
    overdueTasksCount,
    completedTasksCountForArchiveSuggestion,
  } = useMemo(() => {
    // 'tasks' prop here is already 'filteredTasks' from useTasks, meaning it's relevant for currentDate
    // and excludes archived tasks (unless statusFilter is 'archived', but SmartSuggestions is only on daily view)

    const tasksCreatedOnCurrentDate = tasks.filter(task => isSameDay(new Date(task.created_at), currentDate));
    const completedToday = tasksCreatedOnCurrentDate.filter(task => task.status === 'completed').length;
    const totalCreatedToday = tasksCreatedOnCurrentDate.length;

    // Overdue tasks are those with a due_date in the past, and not completed, and not created today
    const overdue = tasks.filter(task =>
      task.due_date &&
      task.status === 'to-do' && // Only count 'to-do' as overdue
      isPast(new Date(task.due_date)) &&
      !isSameDay(new Date(task.due_date), currentDate) // Exclude tasks due today
    ).length;

    // Count of completed tasks currently visible (for archive suggestion)
    const completedVisibleTasks = tasks.filter(task => task.status === 'completed').length;

    return {
      completedTasksToday: completedToday,
      totalTasksToday: totalCreatedToday,
      overdueTasksCount: overdue,
      completedTasksCountForArchiveSuggestion: completedVisibleTasks,
    };
  }, [tasks, currentDate]);

  const handleArchiveCompletedClick = () => {
    const completedTaskIds = tasks.filter(task => task.status === 'completed').map(task => task.id);
    if (completedTaskIds.length > 0) {
      setShowConfirmArchiveDialog(true);
    }
  };

  const confirmArchiveCompleted = async () => {
    const completedTaskIds = tasks.filter(task => task.status === 'completed').map(task => task.id);
    if (completedTaskIds.length > 0) {
      await bulkUpdateTasks({ status: 'archived' }, completedTaskIds);
      clearSelectedTasks();
    }
    setShowConfirmArchiveDialog(false);
  };

  return (
    <Card className="w-full shadow-sm mb-4">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">Smart Suggestions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {overdueTasksCount > 0 && (
            <Button variant="outline" className="justify-start gap-2 h-10">
              <Clock className="h-4 w-4 text-destructive" />
              Review {overdueTasksCount} Overdue Task{overdueTasksCount > 1 ? 's' : ''}
            </Button>
          )}
          {completedTasksCountForArchiveSuggestion > 0 && (
            <Button variant="outline" className="justify-start gap-2 h-10 w-fit" onClick={handleArchiveCompletedClick}> {/* Added w-fit here */}
              <Archive className="h-4 w-4 text-primary" />
              Archive All Completed Tasks
            </Button>
          )}
          {totalTasksToday === 0 && (
            <Button variant="outline" className="justify-start gap-2 h-10">
              <Plus className="h-4 w-4 text-primary" />
              Add Your First Task Today!
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showConfirmArchiveDialog} onOpenChange={setShowConfirmArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move all your completed tasks to the archive. You can view them later in the Archive page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchiveCompleted}>Archive All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default SmartSuggestions;