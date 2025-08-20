import React from 'react';
import { Task, TaskSection } from '@/hooks/useTasks';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ListTodo } from 'lucide-react';
import { getPriorityColor } from '@/utils/taskHelpers';

interface DraggableScheduleTaskItemProps {
  task: Task;
  sections: TaskSection[];
}

const DraggableScheduleTaskItem: React.FC<DraggableScheduleTaskItemProps> = ({ task, sections }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: 'task',
      task: task,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const sectionName = task.section_id ? sections.find(s => s.id === task.section_id)?.name : 'No Section';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 rounded-md bg-card shadow-sm flex items-center gap-2 border-l-4 select-none",
        getPriorityColor(task.priority || 'medium'), // Provide a default if priority is undefined
        isDragging && "opacity-50"
      )}
    >
      <ListTodo className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="flex-grow">
        <p className="text-sm font-medium truncate">{task.description}</p>
        <p className="text-xs text-muted-foreground truncate">{sectionName}</p>
      </div>
    </div>
  );
};

export default DraggableScheduleTaskItem;