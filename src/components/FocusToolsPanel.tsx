import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, EyeOff, Check, Edit, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, TaskCategory, TaskStatus, TaskPriority } from '@/types/task';
import { getCategoryColorProps } from '@/utils/categoryColors';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { useTasks } from '@/hooks/useTasks'; // Corrected import path
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { FocusToolsPanelProps } from '@/types/props';

const FocusToolsPanel: React.FC<FocusToolsPanelProps> = ({
  currentTask,
  onCompleteCurrentTask,
  onSkipCurrentTask,
  onOpenDetail,
  onOpenOverview,
  updateTask,
  sections,
  allCategories,
  handleAddTask,
  currentDate,
  isDemo,
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  // Removed incorrect destructuring from useTasks() as these properties are not exposed by the hook
  // const { updateTask: update, setEditing, tasks, markAllTasksInSectionCompleted, reorderTasks,  updateTaskParentAndOrder } = useTasks();

  if (!currentTask) return null;

  const category = allCategories.find((cat) => cat.id === currentTask.category);
  const section = sections.find((sec) => sec.id === currentTask.section_id);
  const categoryColorProps = category ? getCategoryColorProps(category.color) : null;
  // Removed incorrect destructuring from useTasks()
  // const {  onUpdate } = useTasks();

  const getDueDateText = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getPriorityClasses = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 border-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 border-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 border-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 border-green-600 bg-green-50';
      default:
        return 'text-gray-500 border-gray-500 bg-gray-50';
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    if (!currentTask) return;
    await updateTask(currentTask.id, { status: newStatus });
  };

  const handleUpdate = async (updates: Partial<Task>) => {
    if (!currentTask) return;
    await updateTask(currentTask.id, updates);
  };
  return (
    <div className="flex flex-col space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-2">{currentTask.description}</h2>
      <div className="flex flex-wrap gap-2 text-sm text-gray-500">
        {currentTask.priority && (
          <Badge
            variant="outline"
            className={cn(
              'px-2 py-0.5 rounded-full text-xs border',
              getPriorityClasses(currentTask.priority)
            )}
          >
            {currentTask.priority}
          </Badge>
        )}
        {currentTask.due_date && (
          <Badge
            variant="outline"
            className={cn(
              'px-2 py-0.5 rounded-full text-xs border',
              isPast(parseISO(currentTask.due_date)) && !isToday(parseISO(currentTask.due_date))
                ? 'border-red-500 text-red-500 bg-red-50'
                : 'border-gray-300 text-gray-600'
            )}
          >
            <span className="mr-1">🗓️</span> {getDueDateText(currentTask.due_date)}
          </Badge>
        )}
        {category && (
          <Badge
            variant="outline"
            className={cn(
              'px-2 py-0.5 rounded-full text-xs border',
              categoryColorProps?.dotBorder,
              categoryColorProps?.dotColor,
              categoryColorProps?.backgroundClass
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full mr-1',
                categoryColorProps?.dotColor
              )}
              style={{ backgroundColor: categoryColorProps?.bg }}
            />
            {category.name}
          </Badge>
        )}
        {section && (
          <Badge variant="outline" className="px-2 py-0.5 rounded-full text-xs border border-gray-300 text-gray-600">
            <span className="mr-1">📂</span> {section.name}
          </Badge>
        )}
      </div>

      <div className="flex space-x-2">
        <Button onClick={() => handleUpdateStatus('completed')} className="flex-1">
          <Check className="h-4 w-4 mr-2" /> Complete
        </Button>
        <Button variant="destructive" onClick={() => handleUpdateStatus('skipped')} className="flex-1">
          <X className="h-4 w-4 mr-2" /> Skip
        </Button>
      </div>

      <Button variant="outline" onClick={() => onOpenDetail(currentTask)}>
        <Edit className="h-4 w-4 mr-2" /> Edit Details
      </Button>
      <Button variant="outline" onClick={() => onOpenOverview(currentTask)}>
        <MoreVertical className="h-4 w-4 mr-2" /> Task Overview
      </Button>
    </div>
  );
};

export default FocusToolsPanel;