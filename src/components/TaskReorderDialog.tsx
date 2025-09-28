"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task, TaskSection } from '@/hooks/useTasks';
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";

interface TaskReorderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string | null;
  sectionName: string;
  tasks: Task[]; // Tasks belonging to this section
  allTasks: Task[]; // All tasks for subtask rendering
  onSaveReorder: (sectionId: string | null, reorderedTasks: Task[]) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, any>; // Use any for now, or import Appointment
  isDemo?: boolean;
}

const SortableTaskReorderItem: React.FC<{
  task: Task;
  allTasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, any>;
  isDemo?: boolean;
  isOverlay?: boolean;
}> = ({ task, isOverlay, ...rest }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: rest.isDemo,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex items-center",
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card rounded-lg" : ""
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex-1">
        <TaskItem
          task={task}
          allTasks={rest.allTasks}
          onDelete={rest.onDeleteTask}
          onUpdate={rest.onUpdateTask}
          sections={rest.sections}
          onOpenOverview={rest.onOpenOverview}
          currentDate={rest.currentDate}
          onMoveUp={async () => {}} // Not needed in reorder dialog
          onMoveDown={async () => {}} // Not needed in reorder dialog
          level={0}
          isOverlay={isOverlay}
          setFocusTask={rest.setFocusTask}
          isDoToday={rest.isDoToday}
          toggleDoToday={rest.toggleDoToday}
          scheduledTasksMap={rest.scheduledTasksMap}
          isDemo={rest.isDemo}
        />
      </div>
    </li>
  );
};

const TaskReorderDialog: React.FC<TaskReorderDialogProps> = ({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  tasks,
  allTasks,
  onSaveReorder,
  onUpdateTask,
  onDeleteTask,
  sections,
  onOpenOverview,
  currentDate,
  setFocusTask,
  doTodayOffIds,
  toggleDoToday,
  scheduledTasksMap,
  isDemo = false,
}) => {
  const isMobile = useIsMobile();
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Update local tasks when the prop changes, but only if the dialog is opened
  // or if the underlying tasks array reference changes (e.g., due to external updates)
  useEffect(() => {
    if (isOpen) {
      setLocalTasks(tasks);
    }
  }, [tasks, isOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // Reduced from 8 to 2 for easier drag initiation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isDemo,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const active = tasks.find(t => t.id === event.active.id);
    setActiveTask(active || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setLocalTasks((prevTasks) => {
      const oldIndex = prevTasks.findIndex((task) => task.id === active.id);
      const newIndex = prevTasks.findIndex((task) => task.id === over.id);
      return arrayMove(prevTasks, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveReorder(sectionId, localTasks);
    setIsSaving(false);
    onClose();
  };

  const Content = () => (
    <div className="space-y-4 py-4">
      {localTasks.length === 0 ? (
        <p className="text-muted-foreground text-center">No tasks in this section to reorder.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={localTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {localTasks.map((task) => (
                <SortableTaskReorderItem
                  key={task.id}
                  task={task}
                  allTasks={allTasks}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  sections={sections}
                  onOpenOverview={onOpenOverview}
                  currentDate={currentDate}
                  setFocusTask={setFocusTask}
                  isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                  toggleDoToday={toggleDoToday}
                  scheduledTasksMap={scheduledTasksMap}
                  isDemo={isDemo}
                />
              ))}
            </ul>
          </SortableContext>
          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <SortableTaskReorderItem
                  task={activeTask}
                  allTasks={allTasks}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  sections={sections}
                  onOpenOverview={onOpenOverview}
                  currentDate={currentDate}
                  setFocusTask={setFocusTask}
                  isDoToday={!doTodayOffIds.has(activeTask.original_task_id || activeTask.id)}
                  toggleDoToday={toggleDoToday}
                  scheduledTasksMap={scheduledTasksMap}
                  isDemo={isDemo}
                  isOverlay={true}
                />
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}
    </div>
  );

  const Footer = () => (
    <DialogFooter>
      <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
      <Button onClick={handleSave} disabled={isSaving || localTasks.length === 0}>
        {isSaving ? 'Saving...' : 'Save Order'}
      </Button>
    </DialogFooter>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="h-[90vh] flex flex-col">
            <DrawerHeader className="text-left">
              <DrawerTitle>Reorder Tasks in "{sectionName}"</DrawerTitle>
              <DrawerDescription>Drag and drop tasks to change their order.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4">
              <Content />
            </div>
            <DrawerFooter>
              <Footer />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Reorder Tasks in "{sectionName}"</DialogTitle>
              <DialogDescription>Drag and drop tasks to change their order.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <Content />
            </div>
            <Footer />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default TaskReorderDialog;