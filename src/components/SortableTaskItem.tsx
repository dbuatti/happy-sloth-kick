import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from '@/components/TaskItem';
import { Task, TaskSection, Category } from '@/hooks/useTasks';

interface SortableTaskItemProps {
  task: Task;
  sections: TaskSection[];
  allCategories: Category[];
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (task: Task) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  sections,
  allCategories,
  onUpdate,
  onDelete,
  onEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem
        task={task}
        sections={sections}
        allCategories={allCategories}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onEdit={onEdit}
        playSound={() => {}}
      />
    </div>
  );
};

export default SortableTaskItem;