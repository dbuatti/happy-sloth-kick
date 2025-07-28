export const categoryColorMap = {
  'red': {
    name: 'Red',
    backgroundClass: 'bg-red-50 dark:bg-red-950',
    dotColor: '#ef4444', // Red-500
    dotBorder: 'border-red-300 dark:border-red-700'
  },
  'blue': {
    name: 'Blue',
    backgroundClass: 'bg-blue-50 dark:bg-blue-950',
    dotColor: '#3b82f6', // Blue-500
    dotBorder: 'border-blue-300 dark:border-blue-700'
  },
  'green': {
    name: 'Green',
    backgroundClass: 'bg-green-50 dark:bg-green-950',
    dotColor: '#22c55e', // Green-500
    dotBorder: 'border-green-300 dark:border-green-700'
  },
  'yellow': {
    name: 'Yellow',
    backgroundClass: 'bg-yellow-50 dark:bg-yellow-950',
    dotColor: '#eab308', // Yellow-500
    dotBorder: 'border-yellow-300 dark:border-yellow-700'
  },
  'purple': {
    name: 'Purple',
    backgroundClass: 'bg-purple-50 dark:bg-purple-950',
    dotColor: '#a855f7', // Purple-500
    dotBorder: 'border-purple-300 dark:border-purple-700'
  },
  'pink': {
    name: 'Pink',
    backgroundClass: 'bg-pink-50 dark:bg-pink-950',
    dotColor: '#ec4899', // Pink-500
    dotBorder: 'border-pink-300 dark:border-pink-700'
  },
  'indigo': {
    name: 'Indigo',
    backgroundClass: 'bg-indigo-50 dark:bg-indigo-950',
    dotColor: '#6366f1', // Indigo-500
    dotBorder: 'border-indigo-300 dark:border-indigo-700'
  },
  'gray': {
    name: 'Gray',
    backgroundClass: 'bg-gray-50 dark:bg-gray-950',
    dotColor: '#6b7280', // Gray-500
    dotBorder: 'border-gray-300 dark:border-gray-700'
  },
};

export type CategoryColorKey = keyof typeof categoryColorMap;

export const getCategoryColorProps = (colorKey: string) => {
  return categoryColorMap[colorKey as CategoryColorKey] || categoryColorMap['gray'];
};