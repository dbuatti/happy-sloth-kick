import React, { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Clock, CheckCircle2, ListTodo, Plus } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { isPast, isToday, format } from 'date-fns';
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
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ currentDate, setCurrentDate }) => {
  const { tasks, bulkUpdateTasks, clearSelectedTasks } = useTasks({ currentDate, setCurrentDate });
  const [showConfirmArchiveDialog, setShowConfirmArchiveDialog] = useState(false);

  const {
    completedTasksToday,
    totalTasksToday,
    overdueTasksCount,
    archivedTasksCount,
    completedTasksCount,
  } = useMemo(() => {
    const tasksForToday = tasks.filter(task => isToday(new Date(task.created_at)));
    const completed = tasksForToday.filter(task => task.status === 'completed').length;
    const total = tasksForToday.length;

    const overdue = tasks.filter(task =>
      task.due_date &&
      task.status !== 'completed' &&
      isPast(new Date(task.due_date)) &&
      !isToday(new Date(task.due_date))
    ).length;

    const archived = tasks.filter(task => task.status === 'archived').length;
    const allCompleted = tasks.filter(task => task.status === 'completed').length;

    return {
      completedTasksToday: completed,
      totalTasksToday: total,
      overdueTasksCount: overdue,
      archivedTasksCount: archived,
      completedTasksCount: allCompleted,
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
              <Clock className="h-4 w-4 text-red-500" />
              Review {overdueTasksCount} Overdue Task{overdueTasksCount > 1 ? 's' : ''}
            </Button>
          )}
          {completedTasksCount > 0 && (
            <Button variant="outline" className="justify-start gap-2 h-10" onClick={handleArchiveCompletedClick}>
              <Archive className="h-4 w-4 text-blue-500" />
              Archive All Completed Tasks
            </Button>
          )}
          {totalTasksToday === 0 && (
            <Button variant="outline" className="justify-start gap-2 h-10">
              <Plus className="h-4 w-4 text-green-500" />
              Add Your First Task Today!
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showConfirmArchiveDialog} onOpenChange={setShowConfirmArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Completed Tasks?</AlertDialogTitle>
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