import { Task } from '@/hooks/useTasks'; // Assuming Task is defined here

export const getPriorityColor = (priority: Task['priority'] | string | undefined): string => {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

export const getPriorityDotColor = (priority: Task['priority'] | string | undefined): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

export const categoryColors = [
  { value: '#a8a29e', label: 'Gray', bgColor: 'bg-stone-400', textColor: 'text-stone-800' },
  { value: '#ef4444', label: 'Red', bgColor: 'bg-red-500', textColor: 'text-red-50' },
  { value: '#f97316', label: 'Orange', bgColor: 'bg-orange-500', textColor: 'text-orange-50' },
  { value: '#f59e0b', label: 'Amber', bgColor: 'bg-amber-500', textColor: 'text-amber-50' },
  { value: '#eab308', label: 'Yellow', bgColor: 'bg-yellow-500', textColor: 'text-yellow-50' },
  { value: '#84cc16', label: 'Lime', bgColor: 'bg-lime-500', textColor: 'text-lime-50' },
  { value: '#22c55e', label: 'Green', bgColor: 'bg-green-500', textColor: 'text-green-50' },
  { value: '#14b8a6', label: 'Teal', bgColor: 'bg-teal-500', textColor: 'text-teal-50' },
  { value: '#06b6d4', label: 'Cyan', bgColor: 'bg-cyan-500', textColor: 'text-cyan-50' },
  { value: '#0ea5e9', label: 'Sky', bgColor: 'bg-sky-500', textColor: 'text-sky-50' },
  { value: '#3b82f6', label: 'Blue', bgColor: 'bg-blue-500', textColor: 'text-blue-50' },
  { value: '#6366f1', label: 'Indigo', bgColor: 'bg-indigo-500', textColor: 'text-indigo-50' },
  { value: '#a855f7', label: 'Purple', bgColor: 'bg-purple-500', textColor: 'text-purple-50' },
  { value: '#d946ef', label: 'Fuchsia', bgColor: 'bg-fuchsia-500', textColor: 'text-fuchsia-50' },
  { value: '#ec4899', label: 'Pink', bgColor: 'bg-pink-500', textColor: 'text-pink-50' },
  { value: '#f43f5e', label: 'Rose', bgColor: 'bg-rose-500', textColor: 'text-rose-50' },
];

export const getCategoryColorProps = (hexColor: string | undefined) => {
  const defaultColor = categoryColors[0]; // Gray
  const foundColor = categoryColors.find(color => color.value === hexColor);
  return foundColor || defaultColor;
};