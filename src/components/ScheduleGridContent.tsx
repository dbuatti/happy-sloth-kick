import React from 'react';
import { format, isSameDay, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Appointment, Task, TaskSection } from '@/types/task';
import { TimeBlockActionMenu } from './TimeBlockActionMenu';
import { ScheduleGridContentProps } from '@/types/props';

const ScheduleGridContent: React.FC<ScheduleGridContentProps> = ({
  day,
  timeBlocks,
  appointments,
  tasks,
  sections,
  onAddAppointment,
  onScheduleTask,
  onOpenAppointmentDetail,
  onOpenTaskDetail,
  unscheduledTasks,
}) => {
  return (
    <div className="relative h-full">
      {timeBlocks.map((block, blockIndex) => {
        const currentBlockStart = setHours(setMinutes(startOfDay(day), block.start.getMinutes()), block.start.getHours());
        const currentBlockEnd = setHours(setMinutes(startOfDay(day), block.end.getMinutes()), block.end.getHours());

        const blockAppointments = appointments.filter(app => {
          const appDate = parseISO(app.date);
          const appStart = parseISO(app.date + 'T' + app.start_time);
          const appEnd = parseISO(app.date + 'T' + app.end_time);
          return (
            isSameDay(appDate, day) &&
            ((appStart < currentBlockEnd && appEnd > currentBlockStart) ||
             (appStart.getTime() === currentBlockStart.getTime() && appEnd.getTime() === currentBlockEnd.getTime()))
          );
        });

        const blockTasks = tasks.filter(task => {
          if (!task.due_date) return false;
          const taskDueDate = parseISO(task.due_date);
          return isSameDay(taskDueDate, day);
        });

        return (
          <div
            key={blockIndex}
            className={cn(
              'relative h-16 border-b border-gray-200 dark:border-gray-700 group',
              { 'border-t border-gray-300 dark:border-gray-600': block.start.getMinutes() === 0 }
            )}
          >
            {blockAppointments.map(app => (
              <div
                key={app.id}
                className="absolute inset-0 m-1 p-1 rounded-md text-xs overflow-hidden cursor-pointer"
                style={{ backgroundColor: app.color, color: 'white' }}
                onClick={() => onOpenAppointmentDetail(app)}
              >
                {app.title}
              </div>
            ))}

            {blockTasks.map(task => (
              <div
                key={task.id}
                className="absolute inset-0 m-1 p-1 rounded-md text-xs overflow-hidden cursor-pointer bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                onClick={() => onOpenTaskDetail(task)}
              >
                {task.description}
              </div>
            ))}

            <TimeBlockActionMenu
              block={{ start: currentBlockStart, end: currentBlockEnd }}
              onAddAppointment={onAddAppointment}
              onScheduleTask={onScheduleTask}
              unscheduledTasks={unscheduledTasks}
              sections={sections}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleGridContent;