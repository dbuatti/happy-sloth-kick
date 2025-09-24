import { cn } from "./utils";

export type CategoryColorKey = 'gray' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo' | 'pink' | 'teal';

export const categoryColorMap: Record<CategoryColorKey, { name: string; dotColor: string; backgroundClass: string; dotBorder: string }> = {
  gray: { name: 'Gray', dotColor: 'hsl(var(--muted-foreground))', backgroundClass: 'bg-muted', dotBorder: 'border-muted-foreground' },
  blue: { name: 'Blue', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-blue-500', dotBorder: 'border-blue-500' },
  green: { name: 'Green', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-green-500', dotBorder: 'border-green-500' },
  purple: { name: 'Purple', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-purple-500', dotBorder: 'border-purple-500' },
  yellow: { name: 'Yellow', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-yellow-500', dotBorder: 'border-yellow-500' },
  red: { name: 'Red', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-red-500', dotBorder: 'border-red-500' },
  indigo: { name: 'Indigo', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-indigo-500', dotBorder: 'border-indigo-500' },
  pink: { name: 'Pink', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-pink-500', dotBorder: 'border-pink-500' },
  teal: { name: 'Teal', dotColor: 'hsl(210 40% 96.1%)', backgroundClass: 'bg-teal-500', dotBorder: 'border-teal-500' },
};

export const getCategoryColorProps = (colorKey: string) => {
  const key = colorKey as CategoryColorKey;
  return categoryColorMap[key] || categoryColorMap.gray;
};

export const getRandomCategoryColor = (): CategoryColorKey => {
  const availableColors = Object.keys(categoryColorMap).filter(key => key !== 'gray') as CategoryColorKey[];
  const randomIndex = Math.floor(Math.random() * availableColors.length);
  return availableColors[randomIndex];
};