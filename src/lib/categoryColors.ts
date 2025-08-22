export type CategoryColorKey = 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export const categoryColorMap: Record<CategoryColorKey, { name: string; backgroundClass: string; dotColor: string; dotBorder: string }> = {
  gray: { name: 'Gray', backgroundClass: 'bg-gray-500', dotColor: 'bg-gray-500', dotBorder: 'border-gray-600' },
  red: { name: 'Red', backgroundClass: 'bg-red-500', dotColor: 'bg-red-500', dotBorder: 'border-red-600' },
  orange: { name: 'Orange', backgroundClass: 'bg-orange-500', dotColor: 'bg-orange-500', dotBorder: 'border-orange-600' },
  yellow: { name: 'Yellow', backgroundClass: 'bg-yellow-500', dotColor: 'bg-yellow-500', dotBorder: 'border-yellow-600' },
  green: { name: 'Green', backgroundClass: 'bg-green-500', dotColor: 'bg-green-500', dotBorder: 'border-green-600' },
  blue: { name: 'Blue', backgroundClass: 'bg-blue-500', dotColor: 'bg-blue-500', dotBorder: 'border-blue-600' },
  purple: { name: 'Purple', backgroundClass: 'bg-purple-500', dotColor: 'bg-purple-500', dotBorder: 'border-purple-600' },
};

export const getCategoryColorProps = (color: string) => {
  const key = color as CategoryColorKey;
  return categoryColorMap[key] || categoryColorMap.gray;
};