import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'; // Removed Coordinates
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { arrayMove } from '@dnd-kit/sortable';
import TaskItem from './TaskItem';
import { TaskListProps, TaskItemProps } from '@/types/props';
import { Task, TaskStatus } from '@/types/task';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  processedTasks,
  sections,
  categories,
  onStatusChange,
  onUpdate,
  onDelete,
  onOpenOverview,
  onOpenDetail,
  onAddTask,
  onReorderTasks,
  showDoTodayToggle,
  toggleDoToday,
  doTodayOffIds,
  isDemo,
  // Removed unused: nextAvailableTask, currentDate, archiveAllCompletedTasks, toggleAllDoToday, setIsAddTaskDialogOpen, setPrefilledTaskData, dailyProgress, onOpenFocusView, statusFilter, setStatusFilter, categoryFilter, setCategoryFilter, priorityFilter, setPriorityFilter, sectionFilter, setSectionFilter,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex(task => task.id === active.id);
      const newIndex = tasks.findIndex(task => task.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(tasks, oldIndex, newIndex);

        const updates = newOrder.map((task, index) => ({
          id: task.id,
          order: index,
          section_id: task.section_id,
          parent_task_id: task.parent_task_id,
        }));
        await onReorderTasks(updates);
      }
    }
  };

  const rootTasks = tasks.filter(task => !task.parent_task_id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {rootTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks in this section.</p>
          ) : (
            rootTasks.map((task) => (
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
                createSection={createSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                createCategory={createCategory}
                updateCategory={updateCategory}
                deleteCategory={deleteCategory}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TaskList;