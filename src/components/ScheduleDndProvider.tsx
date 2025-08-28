import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { format, parseISO, isValid } from 'date-fns';
import DraggableScheduleTaskItem from '@/components/DraggableScheduleTaskItem';
import { TaskSection } from '@/hooks/useTasks'; // Removed Task import as it's not directly used here

interface ScheduleDndProviderProps {
  children: React.ReactNode;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  // allTasks: Task[]; // Removed
  sections: TaskSection[];
}

const ScheduleDndProvider: React.FC<ScheduleDndProviderProps> = ({
  children,
  onDragStart,
  onDragEnd,
  // allTasks, // Removed
  sections,
}) => {
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  const handleInternalDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
    onDragStart(event); // Pass to parent handler
  };

  const handleInternalDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    onDragEnd(event); // Pass to parent handler
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleInternalDragStart} onDragEnd={handleInternalDragEnd}>
      {children}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeDragItem?.type === 'task' && (
            <DraggableScheduleTaskItem task={activeDragItem.task} sections={sections} />
          )}
          {activeDragItem?.type === 'appointment' && (() => {
            const startTime = activeDragItem.appointment.start_time ? parseISO(`2000-01-01T${activeDragItem.appointment.start_time}`) : null;
            const endTime = activeDragItem.appointment.end_time ? parseISO(`2000-01-01T${activeDragItem.appointment.end_time}`) : null;
            return (
              <div className="rounded-lg p-2 shadow-md text-white" style={{ backgroundColor: activeDragItem.appointment.color, width: '200px' }}>
                <h4 className="font-semibold text-sm truncate">{activeDragItem.appointment.title}</h4>
                <p className="text-xs opacity-90">
                  {startTime && endTime && isValid(startTime) && isValid(endTime) ? `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}` : 'Invalid time'}
                </p>
              </div>
            );
          })()}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default ScheduleDndProvider;