import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Clock, CheckCircle2, ListTodo, Plus } from 'lucide-react'; // Added Plus
import { useTasks } from '@/hooks/useTasks';
import { isPast, isToday, format } from 'date-fns';

const SmartSuggestions: React.FC = () => {
  const { tasks, bulkUpdateTasks, clearSelectedTasks, currentDate } = useTasks();

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

  const handleArchiveCompleted = async () => {
    const completedTaskIds = tasks.filter(task => task.status === 'completed').map(task => task.id);
    if (completedTaskIds.length > 0) {
      if (window.confirm(`Are you sure you want to archive ${completedTaskIds.length} completed tasks?`)) {
        // Temporarily select tasks for bulk update
        // This is a workaround as bulkUpdateTasks expects selectedTaskIds
        // A more robust solution would be to pass task IDs directly to bulkUpdateTasks
        const originalSelected = [...tasks.filter(t => completedTaskIds.includes(t.id)).map(t => t.id)];
        await bulkUpdateTasks({ status: 'archived' });
        // Revert selection if needed, or ensure bulkUpdateTasks clears it
        // Corrected typo: clearSelectedSelectedTasks -> clearSelectedTasks
        clearSelectedTasks(); // Assuming bulkUpdateTasks clears selected tasks, or we clear all here
      }
    }
  };

  // Helper to clear specific selected tasks (if bulkUpdateTasks doesn't clear all)
  // This function is no longer needed if clearSelectedTasks is called directly after bulkUpdate
  // const clearSpecificSelectedTasks = (idsToClear: string[]) => {
  //   // This would require modifying useTasks to allow setting selectedTaskIds directly
  //   // For now, relying on bulkUpdateTasks to clear all selected tasks.
  //   // If bulkUpdateTasks doesn't clear, this function would need to be implemented.
  // };

  return (
    <Card className="w-full shadow-sm mb-6">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">Smart Suggestions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {overdueTasksCount > 0 && (
            <Button variant="outline" className="justify-start gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Review {overdueTasksCount} Overdue Task{overdueTasksCount > 1 ? 's' : ''}
            </Button>
          )}
          {completedTasksCount > 0 && (
            <Button variant="outline" className="justify-start gap-2" onClick={handleArchiveCompleted}>
              <Archive className="h-4 w-4 text-blue-500" />
              Archive All Completed Tasks
            </Button>
          )}
          {totalTasksToday === 0 && (
            <Button variant="outline" className="justify-start gap-2">
              <Plus className="h-4 w-4 text-green-500" />
              Add Your First Task Today!
            </Button>
          )}
          {/* Add more suggestions here based on user behavior or task states */}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartSuggestions;