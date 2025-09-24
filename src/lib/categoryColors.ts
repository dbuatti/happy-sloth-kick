export type CategoryColorKey = 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo' | 'pink' | 'teal' | 'gray';

export const categoryColorMap: Record<CategoryColorKey, { name: string; dotColor: string; backgroundClass: string; dotBorder: string }> = {
  blue: { name: 'Blue', dotColor: '#3b82f6', backgroundClass: 'bg-blue-500', dotBorder: 'border-blue-500' },
  green: { name: 'Green', dotColor: '#22c55e', backgroundClass: 'bg-green-500', dotBorder: 'border-green-500' },
  purple: { name: 'Purple', dotColor: '#a855f7', backgroundClass: 'bg-purple-500', dotBorder: 'border-purple-500' },
  yellow: { name: 'Yellow', dotColor: '#eab308', backgroundClass: 'bg-yellow-500', dotBorder: 'border-yellow-500' },
  red: { name: 'Red', dotColor: '#ef4444', backgroundClass: 'bg-red-500', dotBorder: 'border-red-500' },
  indigo: { name: 'Indigo', dotColor: '#6366f1', backgroundClass: 'bg-indigo-500', dotBorder: 'border-indigo-500' },
  pink: { name: 'Pink', dotColor: '#ec4899', backgroundClass: 'bg-pink-500', dotBorder: 'border-pink-500' },
  teal: { name: 'Teal', dotColor: '#14b8a6', backgroundClass: 'bg-teal-500', dotBorder: 'border-teal-500' },
  gray: { name: 'Gray', dotColor: '#6b7280', backgroundClass: 'bg-gray-500', dotBorder: 'border-gray-500' },
};

export const getCategoryColorProps = (colorKey: string) => {
  const key = colorKey as CategoryColorKey;
  return categoryColorMap[key] || categoryColorMap.gray;
};