import { cn } from './utils'; // Assuming utils.ts is available for cn

export type CategoryColorKey = 'gray' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo' | 'pink' | 'teal';

export const categoryColorMap: Record<CategoryColorKey, { name: string; dotColor: string; backgroundClass: string; dotBorder: string }> = {
  gray: { name: 'Gray', dotColor: 'hsl(var(--muted-foreground))', backgroundClass: 'bg-muted', dotBorder: 'border-muted-foreground' },
  blue: { name: 'Blue', dotColor: 'hsl(var(--blue-500))', backgroundClass: 'bg-blue-500/10', dotBorder: 'border-blue-500' },
  green: { name: 'Green', dotColor: 'hsl(var(--green-500))', backgroundClass: 'bg-green-500/10', dotBorder: 'border-green-500' },
  purple: { name: 'Purple', dotColor: 'hsl(var(--purple-500))', backgroundClass: 'bg-purple-500/10', dotBorder: 'border-purple-500' },
  yellow: { name: 'Yellow', dotColor: 'hsl(var(--yellow-500))', backgroundClass: 'bg-yellow-500/10', dotBorder: 'border-yellow-500' },
  red: { name: 'Red', dotColor: 'hsl(var(--red-500))', backgroundClass: 'bg-red-500/10', dotBorder: 'border-red-500' },
  indigo: { name: 'Indigo', dotColor: 'hsl(var(--indigo-500))', backgroundClass: 'bg-indigo-500/10', dotBorder: 'border-indigo-500' },
  pink: { name: 'Pink', dotColor: 'hsl(var(--pink-500))', backgroundClass: 'bg-pink-500/10', dotBorder: 'border-pink-500' },
  teal: { name: 'Teal', dotColor: 'hsl(var(--teal-500))', backgroundClass: 'bg-teal-500/10', dotBorder: 'border-teal-500' },
};

export const getCategoryColorProps = (colorKey: string) => {
  return categoryColorMap[colorKey as CategoryColorKey] || categoryColorMap.gray;
};

export const getRandomCategoryColor = (): CategoryColorKey => {
  const keys = Object.keys(categoryColorMap).filter(key => key !== 'gray') as CategoryColorKey[];
  return keys[Math.floor(Math.random() * keys.length)];
};