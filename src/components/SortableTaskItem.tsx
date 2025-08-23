import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './tasks/TaskItem';
import { SortableTaskItemProps } from '@/types';

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  id,
  task,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  categories,
  sections,
  isDragging: propIsDragging,
  tasks,
  doTodayOffLog,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem
        task={task}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
        categories={categories}
        sections={sections}
        isDragging={propIsDragging || isDragging}
        tasks={tasks}
        doTodayOffLog={doTodayOffLog}
      />
    </div>
  );
};

export default SortableTaskItem;