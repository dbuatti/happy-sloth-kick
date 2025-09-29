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
  UniqueIdentifier,
  DragOverEvent,
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
import { GripVertical } from 'lucide-react';

interface TaskReorderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string | null;
  sectionName: string;
  tasks: Task[];
  allTasks: Task[];
  onSaveReorder: (sectionId: string | null, reorderedTasks: Task[]) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, any>;
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
  isDropTarget?: boolean;
  doTodayOffIds: Set<string>; // Used to calculate isDoToday
}> = ({ task, isOverlay, isDropTarget, doTodayOffIds, ...rest }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: rest.isDemo,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    boxShadow: isOverlay ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
    zIndex: isOverlay ? 999 : 'auto',
    rotate: isOverlay ? '2deg' : '0deg',
  };

  // Render a placeholder when the item is being dragged but is not the overlay
  if (isDragging && !isOverlay) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="h-16 bg-muted/50 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground"
      >
        Dragging...
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex items-center",
        isOverlay ? "bg-card rounded-lg" : "",
        isDropTarget && "border-2 border-primary bg-primary/10",
        !isOverlay && "hover:shadow-md hover:scale-[1.005] transition-all duration-200"
      )}
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
          onMoveUp={async () => {}}
          onMoveDown={async () => {}}
          level={0}
          isOverlay={isOverlay}
          setFocusTask={rest.setFocusTask}
          isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
          toggleDoToday={rest.toggleDoToday}
          doTodayOffIds={doTodayOffIds} // Pass doTodayOffIds to TaskItem
          scheduledAppointment={rest.scheduledTasksMap.get(task.id)}
          isDemo={rest.isDemo}
          showDragHandle={true}
          {...listeners}
          {...attributes}
          isSelected={false}
          onSelectTask={() => {}}
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
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalTasks(tasks);
    }
  }, [tasks, isOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
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
    setOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setOverId(null);
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
      <p className="text-sm text-muted-foreground">
        Drag the <GripVertical className="inline-block h-3 w-3 align-baseline" /> handle next to each task to reorder it within this section.
      </p>
      {localTasks.length === 0 ? (
        <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
          <p className="text-lg font-medium mb-2">No tasks to reorder here!</p>
          <p>Add some tasks to this section to organize them.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
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
                  doTodayOffIds={doTodayOffIds}
                  scheduledTasksMap={scheduledTasksMap}
                  isDemo={isDemo}
                  isDropTarget={task.id === overId}
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
                  doTodayOffIds={doTodayOffIds}
                  scheduledTasksMap={scheduledTasksMap}
                  isDemo={isDemo}
                  isOverlay={true}
                  isDropTarget={false}
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