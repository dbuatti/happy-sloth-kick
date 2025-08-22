import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Task, TaskSection, TaskCategory, TaskPriority } from '@/types/task';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/utils/categoryColors';
import { NextTaskCardProps } from '@/types/props';
import { Badge } from '@/components/ui/badge';

const NextTaskCard: React.FC<NextTaskCardProps> = ({
  nextAvailableTask,
  sections,
  allCategories,
  onOpenOverview,
  onOpenFocusView,
}) => {
  if (!nextAvailableTask) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Next Task</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center text-center text-gray-500">
          No tasks currently in focus mode.
        </CardContent>
      </Card>
    );
  }

  const category = allCategories.find((cat: TaskCategory) => cat.id === nextAvailableTask.category);
  const section = sections.find((sec: TaskSection) => sec.id === nextAvailableTask.section_id);
  const categoryColorProps = category ? getCategoryColorProps(category.color) : null;

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Next Task</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between space-y-4">
        <div>
          <p className="text-xl font-semibold mb-2">{nextAvailableTask.description}</p>
          <div className="flex flex-wrap gap-2 text-sm text-gray-500">
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
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenOverview(nextAvailableTask)}>
            <ArrowRight className="mr-2 h-4 w-4" /> View Details
          </Button>
          <Button className="flex-1" onClick={() => onOpenFocusView(nextAvailableTask)}>
            <Play className="mr-2 h-4 w-4" /> Start Focus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;