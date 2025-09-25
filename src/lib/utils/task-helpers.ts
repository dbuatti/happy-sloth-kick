import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { Task } from '@/hooks/useTasks';
import { showSuccess, showError } from '@/utils/toast';

export const getPriorityDotColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-priority-urgent';
    case 'high': return 'bg-priority-high';
    case 'medium': return 'bg-priority-medium';
    case 'low': return 'bg-priority-low';
    default: return 'bg-gray-500';
  }
};

export const getDueDateDisplay = (dueDate: string | null, currentDate: Date) => {
  if (!dueDate) return null;
  const date = parseISO(dueDate);
  if (!isValid(date)) return null;

  if (isSameDay(date, currentDate)) {
    return 'Today';
  } else if (isPast(date) && !isSameDay(date, currentDate)) {
    return format(date, 'MMM d');
  } else {
    return format(date, 'MMM d');
  }
};

export const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

export const handleCopyPath = async (e: React.MouseEvent, path: string) => {
  e.stopPropagation();
  try {
    await navigator.clipboard.writeText(path);
    showSuccess('Path copied to clipboard!');
  } catch (err) {
    showError('Could not copy path.');
  }
};

export const getTaskPriorityColorClass = (priority: Task['priority']) => {
  switch (priority) {
    case 'urgent': return 'text-priority-urgent';
    case 'high': return 'text-priority-high';
    case 'medium': return 'text-priority-medium';
    case 'low': return 'text-priority-low';
    default: return 'text-muted-foreground';
  }
};