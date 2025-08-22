import { CategoryColorKey } from '@/types/task';

export const categoryColors: Record<CategoryColorKey, { name: string; backgroundClass: string; dotColor: string; dotBorder: string; bg: string }> = {
  red: {
    name: 'Red',
    backgroundClass: 'bg-red-100 dark:bg-red-900',
    dotColor: 'text-red-500',
    dotBorder: 'border-red-500',
    bg: '#ef4444',
  },
  blue: {
    name: 'Blue',
    backgroundClass: 'bg-blue-100 dark:bg-blue-900',
    dotColor: 'text-blue-500',
    dotBorder: 'border-blue-500',
    bg: '#3b82f6',
  },
  green: {
    name: 'Green',
    backgroundClass: 'bg-green-100 dark:bg-green-900',
    dotColor: 'text-green-500',
    dotBorder: 'border-green-500',
    bg: '#22c55e',
  },
  yellow: {
    name: 'Yellow',
    backgroundClass: 'bg-yellow-100 dark:bg-yellow-900',
    dotColor: 'text-yellow-500',
    dotBorder: 'border-yellow-500',
    bg: '#eab308',
  },
  purple: {
    name: 'Purple',
    backgroundClass: 'bg-purple-100 dark:bg-purple-900',
    dotColor: 'text-purple-500',
    dotBorder: 'border-purple-500',
    bg: '#a855f7',
  },
  orange: {
    name: 'Orange',
    backgroundClass: 'bg-orange-100 dark:bg-orange-900',
    dotColor: 'text-orange-500',
    dotBorder: 'border-orange-500',
    bg: '#f97316',
  },
  pink: {
    name: 'Pink',
    backgroundClass: 'bg-pink-100 dark:bg-pink-900',
    dotColor: 'text-pink-500',
    dotBorder: 'border-pink-500',
    bg: '#ec4899',
  },
  teal: {
    name: 'Teal',
    backgroundClass: 'bg-teal-100 dark:bg-teal-900',
    dotColor: 'text-teal-500',
    dotBorder: 'border-teal-500',
    bg: '#14b8a6',
  },
  cyan: {
    name: 'Cyan',
    backgroundClass: 'bg-cyan-100 dark:bg-cyan-900',
    dotColor: 'text-cyan-500',
    dotBorder: 'border-cyan-500',
    bg: '#06b6d4',
  },
  gray: {
    name: 'Gray',
    backgroundClass: 'bg-gray-100 dark:bg-gray-700',
    dotColor: 'text-gray-500',
    dotBorder: 'border-gray-500',
    bg: '#6b7280',
  },
};

export const getCategoryColorProps = (colorKey: string) => {
  return categoryColors[colorKey as CategoryColorKey] || categoryColors.gray;
};