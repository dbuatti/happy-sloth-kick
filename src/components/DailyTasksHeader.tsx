import React, { useState, useCallback } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { showError } from '@/utils/toast';

interface DailyTasksHeaderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  userId?: string;
  onRestoreTasks: () => void;
  isRestoring: boolean;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  userId,
  onRestoreTasks,
  isRestoring,
}) => {
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  
  // Fetch tasks for the current date to determine the next task to complete
  const { tasks: allTasks, updateTask, sections } = useTasks({ currentDate, userId });

  // Get all "to-do" tasks for the current day, sorted by section order and task order
  const todoTasks = allTasks
    .filter(task => task.status === 'to-do')
    .sort((a, b) => {
      // Sort by section order first
      const sectionA = sections.find(s => s.id === a.section_id);
      const sectionB = sections.find(s => s.id === b.section_id);
      const sectionOrderA = sectionA?.order ?? 999;
      const sectionOrderB = sectionB?.order ?? 999;
      
      if (sectionOrderA !== sectionOrderB) {
        return sectionOrderA - sectionOrderB;
      }
      
      // Then by task order within section
      return (a.order ?? 0) - (b.order ?? 0);
    });

  const handlePreviousDay = useCallback(() => {
    setCurrentDate(subDays(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const handleNextDay = useCallback(() => {
    setCurrentDate(addDays(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  const handleMarkNextTaskComplete = useCallback(async () => {
    if (todoTasks.length === 0 || isCompletingTask) return;
    
    setIsCompletingTask(true);
    const nextTask = todoTasks[0];
    
    try {
      // For real tasks, update normally
      await updateTask(nextTask.id, { status: 'completed' });
      toast.success(`Completed "${nextTask.description}"`);
    } catch (error) {
      console.error('Error marking task complete:', error);
      showError('Failed to mark task as complete');
    } finally {
      setIsCompletingTask(false);
    }
  }, [todoTasks, isCompletingTask, updateTask]);

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousDay} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={handleToday}
              className={isToday(currentDate) ? "bg-primary text-primary-foreground" : ""}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextDay} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2">
              <h2 className="text-xl font-bold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
              <p className="text-sm text-muted-foreground">
                {isToday(currentDate) ? 'Today' : format(currentDate, 'EEEE')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Daily Tasks
            </Badge>
            <Button 
              onClick={handleMarkNextTaskComplete}
              disabled={todoTasks.length === 0 || isCompletingTask}
              variant="default"
              size="sm"
              className="flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" />
              {isCompletingTask ? 'Completing...' : 'Mark Next Complete'}
            </Button>
            <Button 
              onClick={onRestoreTasks}
              disabled={isRestoring}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <RotateCcw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {todoTasks.length > 0 
              ? `You have ${todoTasks.length} task${todoTasks.length > 1 ? 's' : ''} to do today.` 
              : 'No tasks for today. Great job!'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyTasksHeader;