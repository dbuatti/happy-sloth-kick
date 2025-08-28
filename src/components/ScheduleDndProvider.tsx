import React, { useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, KeyboardSensor, UniqueIdentifier } from '@dnd-kit/core';
import { Task, TaskSection } from '@/hooks/useTasks'; // Keep TaskSection
import { createPortal } from 'react-dom';
import DraggableScheduleTaskItem from './DraggableScheduleTaskItem';
import AppointmentCard from './AppointmentCard';
import { Appointment } from '@/hooks/useAppointments';

interface ScheduleDndProviderProps {
  children: React.ReactNode;
  onDragStart: (event: any) => void;
  onDragEnd: (event: any) => void;
  // allTasks: Task[]; // Removed as it's not directly used by DndProvider
  sections: TaskSection[];
}

const ScheduleDndProvider: React.FC<ScheduleDndProviderProps> = ({
  children,
  onDragStart,
  onDragEnd,
  // allTasks, // Removed
  sections,
}) => {
  const [activeDragItem, setActiveDragItem] = useState<{ type: 'task' | 'appointment'; item: Task | Appointment; duration?: number } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const { type, task, appointment, duration } = active.data.current;

    if (type === 'task' && task) {
      setActiveDragItem({ type: 'task', item: task });
    } else if (type === 'appointment' && appointment) {
      setActiveDragItem({ type: 'appointment', item: appointment, duration });
    }
    onDragStart(event);
  };

  const handleDragEnd = (event: any) => {
    setActiveDragItem(null);
    onDragEnd(event);
  };

  const renderDragOverlay = () => {
    if (!activeDragItem) return null;

    if (activeDragItem.type === 'task') {
      const task = activeDragItem.item as Task;
      return (
        <DraggableScheduleTaskItem task={task} sections={sections} />
      );
    } else if (activeDragItem.type === 'appointment') {
      const appointment = activeDragItem.item as Appointment;
      return (
        <AppointmentCard
          appointment={appointment}
          onEdit={() => {}} // Placeholder
          onUnschedule={() => {}} // Placeholder
          trackIndex={0}
          totalTracks={1}
        />
      );
    }
    return null;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      {createPortal(
        <DragOverlay>
          {renderDragOverlay()}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default ScheduleDndProvider;