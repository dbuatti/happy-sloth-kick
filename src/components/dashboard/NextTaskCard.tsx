import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Task, TaskStatus } from '@/types/task';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { getCategoryColorProps } from '@/utils/categoryColors';
import { NextTaskCardProps } from '@/types/props';
import { Badge } from '@/components/ui/badge';

const NextTaskCard: React.FC<NextTaskCardProps> = ({
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenDetail,
  sections,
  categories,
}) => {
  const handleStatusChange = async (
    taskId: string,
    newStatus: TaskStatus
  ) => {
    await updateTask(taskId, { status: newStatus });
  };

  const getDueDateText = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getPriorityClasses = (priority: Task['priority']) => {
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

  if (!nextAvailableTask) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Next Task</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center text-center text-gray-500">
          No tasks currently in focus.
        </CardContent>
      </Card>
    );
  }

  const category = categories.find((cat) => cat.id === nextAvailableTask.category);
  const section = sections.find((sec) => sec.id === nextAvailableTask.section_id);
  const categoryColorProps = category ? getCategoryColorProps(category.color) : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Next Task</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => onOpenDetail(nextAvailableTask)}>
          Details
        </Button>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <Checkbox
              id={`task-${nextAvailableTask.id}`}
              checked={nextAvailableTask.status === 'completed'}
              onCheckedChange={(checked: boolean) =>
                handleStatusChange(
                  nextAvailableTask.id,
                  checked ? 'completed' : 'to-do'
                )
              }
              className="mt-1"
            />
            <label
              htmlFor={`task-${nextAvailableTask.id}`}
              className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {nextAvailableTask.description}
            </label>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {nextAvailableTask.priority && (
              <Badge
                variant="outline"
                className={cn(
                  'px-2 py-0.5 rounded-full border',
                  getPriorityClasses(nextAvailableTask.priority)
                )}
              >
                {nextAvailableTask.priority}
              </Badge>
            )}
            {nextAvailableTask.due_date && (
              <Badge
                variant="outline"
                className={cn(
                  'px-2 py-0.5 rounded-full border',
                  isPast(parseISO(nextAvailableTask.due_date)) && !isToday(parseISO(nextAvailableTask.due_date))
                    ? 'border-red-500 text-red-500 bg-red-50'
                    : 'border-gray-300 text-gray-600'
                )}
              >
                <span className="mr-1">🗓️</span> {getDueDateText(nextAvailableTask.due_date)}
              </Badge>
            )}
            {category && (
              <Badge
                variant="outline"
                className={cn(
                  'px-2 py-0.5 rounded-full border',
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
              <Badge variant="outline" className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
                <span className="mr-1">📂</span> {section.name}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="secondary"
          className="w-full mt-4"
          onClick={() => onOpenOverview(nextAvailableTask)}
        >
          Start Focus
        </Button>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;