import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, Coordinates } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { Task, TaskSection } from '@/types/task'; // Removed unused TaskCategory
import TaskItem from './TaskItem';
import { TaskListProps } from '@/types/props';

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  sections,
  categories,
  onStatusChange,
  onUpdate,
  onDelete,
  onOpenOverview,
  onOpenDetail,
  onAddTask,
  onReorderTasks,
  showDoTodayToggle = false,
  toggleDoToday,
  doTodayOffIds,
  isDemo,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event: KeyboardEvent): Coordinates | null => {
        if (event.code === 'Space') {
          return { x: 0, y: 0 };
        }
        return null;
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeTask = active.data.current?.task as Task;
    const overItem = over.data.current;

    if (active.id === over.id) {
      return;
    }

    if (overItem?.type === 'Task') {
      const overTask = overItem.task as Task;

      // If moving within the same section or to a new section
      if (activeTask.section_id === overTask.section_id) {
        const sectionTasks = tasks.filter(t => t.section_id === activeTask.section_id).sort((a, b) => (a.order || 0) - (b.order || 0));
        const oldIndex = sectionTasks.findIndex(t => t.id === active.id);
        const newIndex = sectionTasks.findIndex(t => t.id === over.id);
        const newSectionTasksOrder = arrayMove(sectionTasks, oldIndex, newIndex);

        await onReorderTasks(newSectionTasksOrder.map((t, index) => ({
          id: t.id,
          order: index,
          section_id: t.section_id,
          parent_task_id: t.parent_task_id
        })));
      } else {
        // Moving to a different section (or from no section to a section)
        // Update the active task's section_id and place it at the overTask's order
        await onUpdate(activeTask.id, { section_id: overTask.section_id });
        await onReorderTasks([{ id: activeTask.id, section_id: overTask.section_id, order: overTask.order, parent_task_id: activeTask.parent_task_id }]);
      }
    } else if (overItem?.type === 'Section') {
      const overSection = overItem.section as TaskSection;
      // Moving a task to a new section, place it at the top of that section
      await onUpdate(activeTask.id, { section_id: overSection.id });
      await onReorderTasks([{ id: activeTask.id, section_id: overSection.id, order: 0, parent_task_id: activeTask.parent_task_id }]);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allTasks={tasks}
              sections={sections}
              categories={categories}
              onStatusChange={onStatusChange}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onOpenOverview={onOpenOverview}
              onOpenDetail={onOpenDetail}
              onAddTask={onAddTask}
              onReorderTasks={onReorderTasks}
              showDoTodayToggle={showDoTodayToggle}
              toggleDoToday={toggleDoToday}
              isDoTodayOff={doTodayOffIds?.has(task.id)}
              isDemo={isDemo}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TaskList;