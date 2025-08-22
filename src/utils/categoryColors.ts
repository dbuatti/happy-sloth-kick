// Removed unused import: import { TaskCategory } from '@/types/task';

interface CategoryColorProps {
  bg: string;
  text: string;
  dotColor: string;
  dotBorder: string;
  backgroundClass: string;
  name: string; // Added name property for SelectDialog
}

export const categoryColors: Record<string, CategoryColorProps> = {
  red: {
    bg: '#fef2f2',
    text: '#ef4444',
    dotColor: 'bg-red-500',
    dotBorder: 'border-red-500',
    backgroundClass: 'bg-red-50',
    name: 'Red',
  },
  orange: {
    bg: '#fff7ed',
    text: '#f97316',
    dotColor: 'bg-orange-500',
    dotBorder: 'border-orange-500',
    backgroundClass: 'bg-orange-50',
    name: 'Orange',
  },
  yellow: {
    bg: '#fffbeb',
    text: '#f59e0b',
    dotColor: 'bg-yellow-500',
    dotBorder: 'border-yellow-500',
    backgroundClass: 'bg-yellow-50',
    name: 'Yellow',
  },
  green: {
    bg: '#f0fdf4',
    text: '#22c55e',
    dotColor: 'bg-green-500',
    dotBorder: 'border-green-500',
    backgroundClass: 'bg-green-50',
    name: 'Green',
  },
  blue: {
    bg: '#eff6ff',
    text: '#3b82f6',
    dotColor: 'bg-blue-500',
    dotBorder: 'border-blue-500',
    backgroundClass: 'bg-blue-50',
    name: 'Blue',
  },
  indigo: {
    bg: '#eef2ff',
    text: '#6366f1',
    dotColor: 'bg-indigo-500',
    dotBorder: 'border-indigo-500',
    backgroundClass: 'bg-indigo-50',
    name: 'Indigo',
  },
  purple: {
    bg: '#f5f3ff',
    text: '#a855f7',
    dotColor: 'bg-purple-500',
    dotBorder: 'border-purple-500',
    backgroundClass: 'bg-purple-50',
    name: 'Purple',
  },
  pink: {
    bg: '#fdf2f8',
    text: '#ec4899',
    dotColor: 'bg-pink-500',
    dotBorder: 'border-pink-500',
    backgroundClass: 'bg-pink-50',
    name: 'Pink',
  },
  gray: {
    bg: '#f9fafb',
    text: '#6b7280',
    dotColor: 'bg-gray-500',
    dotBorder: 'border-gray-500',
    backgroundClass: 'bg-gray-50',
    name: 'Gray',
  },
};

export const getCategoryColorProps = (colorKey: string): CategoryColorProps => {
  return categoryColors[colorKey] || categoryColors.gray;
};