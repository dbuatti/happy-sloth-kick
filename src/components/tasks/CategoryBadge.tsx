import React from 'react';

interface TaskCategory {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

interface CategoryBadgeProps {
  category: TaskCategory;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: category.color, color: 'white' }}>
      {category.name}
    </span>
  );
};

export default CategoryBadge;