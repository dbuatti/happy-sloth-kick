import React from 'react';
import { Appointment } from '@/hooks/useAppointments';
import { Task } from '@/hooks/useTasks';
import DraggableAppointmentCard from '@/components/DraggableAppointmentCard';

interface PositionedAppointment extends Appointment {
  gridColumn: number;
  gridRowStart: number;
  gridRowEnd: number;
  trackIndex: number;
  totalTracks: number;
}

interface ScheduleAppointmentsLayerProps {
  appointmentsWithPositions: PositionedAppointment[];
  allTasks: Task[];
  onAppointmentClick: (appointment: Appointment) => void;
  onUnscheduleTask: (appointmentId: string) => Promise<void>;
}

const ScheduleAppointmentsLayer: React.FC<ScheduleAppointmentsLayerProps> = ({
  appointmentsWithPositions,
  allTasks,
  onAppointmentClick,
  onUnscheduleTask,
}) => {
  return (
    <>
      {appointmentsWithPositions.map((app) => {
        const task = app.task_id ? allTasks.find(t => t.id === app.task_id) : undefined;
        return (
          <DraggableAppointmentCard
            key={app.id}
            appointment={app}
            task={task}
            onEdit={onAppointmentClick}
            onUnschedule={onUnscheduleTask}
            trackIndex={app.trackIndex}
            totalTracks={app.totalTracks}
            style={{
              gridColumn: app.gridColumn,
              gridRow: `${app.gridRowStart} / ${app.gridRowEnd}`,
              zIndex: 10 + app.trackIndex,
            }}
          />
        );
      })}
    </>
  );
};

export default ScheduleAppointmentsLayer;