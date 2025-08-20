import { Task } from '@/hooks/useTasks';

export const getPriorityColor = (priority: Task['priority'] | string): string => {
  switch (priority) {
    case 'urgent':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

export const getPriorityDotColor = (priority: Task['priority'] | string): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};