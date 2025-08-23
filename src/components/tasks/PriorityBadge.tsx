import React from 'react';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const colors = {
    low: 'bg-gray-200 text-gray-800',
    medium: 'bg-blue-200 text-blue-800',
    high: 'bg-orange-200 text-orange-800',
    urgent: 'bg-red-200 text-red-800',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>{priority}</span>;
};

export default PriorityBadge;