import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, TaskCategory, NewTaskData } from '@/types'; // Corrected imports
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount'; // Corrected import
import { useSound } from '@/context/SoundContext';
import { toast } from 'react-hot-toast';

interface DailyTasksHeaderProps {
  currentDate: Date;
  onAddTask: (taskData: NewTaskData) => Promise<Task>; // Changed signature to accept NewTaskData object
  onRefreshTasks: () => void;
  dailyProgress: { completed: number; total: number; percentage: number };
  sections: TaskSection[];
  categories: TaskCategory[];
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  onAddTask,
  onRefreshTasks,
  dailyProgress,
  sections,
  categories,
}) => {
  // useDailyTaskCount is a hook that takes tasks as an argument, but it's not used here.
  // If dailyProgress is passed as a prop, this hook might be redundant or used incorrectly.
  // For now, I'll remove the call to avoid the error, assuming dailyProgress is sufficient.
  // If dailyProgress needs to be calculated here, the tasks prop should be passed to useDailyTaskCount.
  // const { dailyProgress: calculatedDailyProgress } = useDailyTaskCount(tasks); // Example if tasks were available

  const { playSound } = useSound();

  const handleQuickAddTask = async () => {
    const description = prompt('Enter new task description:');
    if (description) {
      const loadingToastId = showLoading('Adding task...');
      try {
        const newTaskData: NewTaskData = {
          description,
          status: 'to-do',
          priority: 'medium',
          due_date: null,
          notes: null,
          remind_at: null,
          section_id: null,
          parent_task_id: null,
          recurring_type: 'none',
          original_task_id: null,
          category: null,
          link: null,
          image_url: null,
        };
        await onAddTask(newTaskData);
        dismissToast(loadingToastId);
        playSound('add');
        toast.success('Task added!');
      } catch (error) {
        dismissToast(loadingToastId);
        showError('Failed to add task.');
        console.error('Error adding task:', error);
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold mb-4 sm:mb-0">Daily Tasks</h2>
      <div className="flex space-x-2">
        <Button onClick={handleQuickAddTask} variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Quick Add Task
        </Button>
        <Button onClick={onRefreshTasks} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
    </div>
  );
};

export default DailyTasksHeader;