"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { useTasks } from '@/hooks/useTasks';
import SortableTaskItem from './SortableTaskItem';
import { SectionHeader } from './SectionHeader';
import TaskForm from './TaskForm';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { Task, TaskSection, TaskCategory } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface TaskListProps {
  currentDate: Date;
}

const TaskList: React.FC<TaskListProps> = ({ currentDate }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const isDemo = user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const {
    tasks,
    sections,
    categories,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    updateSectionIncludeInFocusMode,
    markAllTasksInSectionCompleted,
  } = useTasks({ currentDate, userId, viewMode: 'all' }); // Pass viewMode

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [sectionForNewTask, setSectionForNewTask] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setExpandedSections(new Set(sections.map((section: TaskSection) => section.id)));
  }, [sections, tasks]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'section' && overType === 'section') {
      const oldIndex = sections.findIndex((s: TaskSection) => s.id === active.id);
      const newIndex = sections.findIndex((s: TaskSection) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSectionsOrder = arrayMove(sections, oldIndex, newIndex);
        await reorderSections(newSectionsOrder.map((s: TaskSection, index) => ({ id: s.id, order: index })));
      }
    } else if (activeType === 'task' && overType === 'task') {
      const activeTask = tasks.find(t => t.id === active.id);
      const overTask = tasks.find(t => t.id === over.id);

      if (activeTask && overTask && activeTask.section_id === overTask.section_id) {
        const sectionTasks = tasks.filter(t => t.section_id === activeTask.section_id).sort((a, b) => (a.order || 0) - (b.order || 0));
        const oldIndex = sectionTasks.findIndex(t => t.id === active.id);
        const newIndex = sectionTasks.findIndex(t => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newSectionTasksOrder = arrayMove(sectionTasks, oldIndex, newIndex);
          await reorderTasks(newSectionTasksOrder.map((t, index) => ({ id: t.id, order: index, section_id: t.section_id, parent_task_id: t.parent_task_id })));
        }
      } else if (activeTask && overTask && activeTask.section_id !== overTask.section_id) {
        await updateTask(activeTask.id, { section_id: overTask.section_id });
        await reorderTasks([{ id: activeTask.id, section_id: overTask.section_id, order: overTask.order }]);
      }
    } else if (activeType === 'task' && overType === 'section') {
      const activeTask = tasks.find(t => t.id === active.id);
      const overSection = sections.find((s: TaskSection) => s.id === over.id);

      if (activeTask && overSection) {
        await updateTask(activeTask.id, { section_id: overSection.id });
        await reorderTasks([{ id: activeTask.id, section_id: overSection.id, order: 0 }]);
      }
    }
  };

  const openAddTaskForSection = (sectionId: string | null) => {
    setSectionForNewTask(sectionId);
    setIsAddingTask(true);
    setTaskToEdit(null);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsAddingTask(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (taskToEdit) {
      await updateTask(taskToEdit.id, taskData);
    } else {
      await addTask({ ...taskData, section_id: sectionForNewTask || null });
    }
    setIsAddingTask(false);
    setTaskToEdit(null);
    setSectionForNewTask(null);
  };

  const handleCancelTaskForm = () => {
    setIsAddingTask(false);
    setTaskToEdit(null);
    setSectionForNewTask(null);
  };

  const handleCreateSection = async () => {
    await createSection('New Section');
  };

  const handleDeleteSection = async (sectionId: string) => {
    const sectionTasks = tasks.filter(task => task.section_id === sectionId);
    if (sectionTasks.length > 0) {
      console.error("Cannot delete section with tasks. Please move or delete tasks first.");
      return;
    }
    await deleteSection(sectionId);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => task.status !== 'archived');
  }, [tasks]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">My Tasks</h2>
        <Button onClick={() => openAddTaskForSection(null)}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      {isAddingTask && (
        <TaskForm
          task={taskToEdit}
          sections={sections}
          categories={categories}
          onSave={handleSaveTask}
          onCancel={handleCancelTaskForm}
          initialSectionId={sectionForNewTask}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sections.map((s: TaskSection) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sections.map((section: TaskSection) => {
              const sectionTasks = filteredTasks
                .filter(task => task.section_id === section.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

              return (
                <div key={section.id} className="bg-card rounded-lg shadow-sm border">
                  <SectionHeader
                    section={section}
                    taskCount={sectionTasks.length}
                    onEdit={updateSection}
                    onDelete={handleDeleteSection}
                    onAddTask={(sectionId: string | null) => openAddTaskForSection(sectionId)}
                    onMarkAllCompleted={markAllTasksInSectionCompleted}
                    onToggleFocusMode={updateSectionIncludeInFocusMode}
                    isExpanded={expandedSections.has(section.id)}
                    toggleSection={toggleSection}
                    // isDemo prop removed as it's not part of SectionHeaderProps
                  />
                  {expandedSections.has(section.id) && (
                    <SortableContext items={sectionTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="p-4 space-y-2">
                        {sectionTasks.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No tasks in this section.</p>
                        ) : (
                          sectionTasks.map(task => (
                            <SortableTaskItem
                              key={task.id}
                              task={task}
                              categories={categories}
                              onEdit={handleEditTask}
                              onDelete={deleteTask}
                              onUpdate={updateTask}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
            <Button onClick={handleCreateSection} variant="outline" className="w-full mt-4">
              <PlusIcon className="mr-2 h-4 w-4" /> Add New Section
            </Button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default TaskList;