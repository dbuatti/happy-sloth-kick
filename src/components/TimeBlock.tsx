import React from 'react';
import { format, isSameMinute, isSameHour, isSameDay, parseISO } from 'date-fns'; // Added parseISO
import { cn } from '@/lib/utils';
import { Appointment, Task, TaskSection } from '@/types/task';
import { TimeBlockActionMenu } from './TimeBlockActionMenu';
import { TimeBlockProps } from '@/types/props';

const TimeBlock: React.FC<TimeBlockProps> = ({
  block,
  appointments,
  tasks,
  sections,
  onAddAppointment,
  onScheduleTask,
  onOpenAppointmentDetail,
  onOpenTaskDetail,
  unscheduledTasks,
}) => {
  const blockStart = block.start;
  const blockEnd = block.end;

  const relevantAppointments = appointments.filter(app => {
    const appStart = parseISO(app.date + 'T' + app.start_time); // Use parseISO
    const appEnd = parseISO(app.date + 'T' + app.end_time); // Use parseISO
    return (
      isSameDay(appStart, blockStart) &&
      ((appStart < blockEnd && appEnd > blockStart) ||
       (isSameMinute(appStart, blockStart) && isSameHour(appStart, blockStart)))
    );
  });

  const relevantTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    const taskDueDate = parseISO(task.due_date);
    return isSameDay(taskDueDate, blockStart);
  });

  return (
    <div
      className={cn(
        'relative h-16 border-b border-gray-200 dark:border-gray-700 group',
        { 'border-t border-gray-300 dark:border-gray-600': blockStart.getMinutes() === 0 }
      )}
    >
      {blockStart.getMinutes() === 0 && (
        <div className="absolute -left-16 top-0 w-14 text-right text-xs text-gray-500 pr-2">
          {format(blockStart, 'h a')}
        </div>
      )}

      {relevantAppointments.map(app => (
        <div
          key={app.id}
          className="absolute inset-0 m-1 p-1 rounded-md text-xs overflow-hidden cursor-pointer"
          style={{ backgroundColor: app.color, color: 'white' }}
          onClick={() => onOpenAppointmentDetail(app)}
        >
          {app.title}
        </div>
      ))}

      {relevantTasks.map(task => (
        <div
          key={task.id}
          className="absolute inset-0 m-1 p-1 rounded-md text-xs overflow-hidden cursor-pointer bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          onClick={() => onOpenTaskDetail(task)}
        >
          {task.description}
        </div>
      ))}

      <TimeBlockActionMenu
        block={block}
        onAddAppointment={onAddAppointment}
        onScheduleTask={onScheduleTask}
        unscheduledTasks={unscheduledTasks}
        sections={sections}
      />
    </div>
  );
};

export default TimeBlock;