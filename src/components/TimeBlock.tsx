import React from 'react';
import TimeBlockActionMenu from '@/components/TimeBlockActionMenu';
import { Appointment } from '@/types';
import { Task, TaskSection, TaskCategory, DoTodayOffLogEntry } from '@/types';
import { format, parse } from 'date-fns';

interface TimeBlockProps {
  block: { start: Date; end: Date };
  appointments: Appointment[];
  tasks: Task[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  onAddAppointment: (title: string, startTime: string, endTime: string, color: string, taskId?: string | null) => Promise<Appointment>;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
  onScheduleTask: (task: Task, startTime: string, endTime: string) => Promise<Appointment>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

const TimeBlock: React.FC<TimeBlockProps> = ({
  block,
  appointments,
  tasks,
  allCategories,
  allSections,
  onAddAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onScheduleTask,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  doTodayOffLog,
}) => {
  const blockAppointments = appointments.filter(app => {
    const appStart = parse(app.start_time, 'HH:mm', block.start);
    const appEnd = parse(app.end_time, 'HH:mm', block.start);
    return (appStart < block.end && appEnd > block.start);
  });

  return (
    <div className="relative h-full border-b border-l border-dashed flex items-center justify-center">
      {blockAppointments.map((app, index) => {
        const linkedTask = tasks.find(t => t.id === app.task_id);
        return (
          <div key={app.id} className="absolute inset-0 p-1">
            {/* Render appointment card here */}
            <div className="bg-blue-200 text-blue-800 rounded-md p-1 text-xs h-full overflow-hidden">
              {app.title}
              {linkedTask && <span className="block text-gray-600">({linkedTask.description})</span>}
            </div>
          </div>
        );
      })}
      <div className="absolute top-1 right-1">
        <TimeBlockActionMenu
          block={block}
          onAddAppointment={onAddAppointment}
          onEditAppointment={onEditAppointment}
          onDeleteAppointment={onDeleteAppointment}
          onScheduleTask={onScheduleTask}
          availableTasks={tasks}
          availableSections={allSections}
          availableCategories={allCategories}
          selectedDate={block.start}
          selectedTimeSlot={{ start: block.start, end: block.end }}
        />
      </div>
    </div>
  );
};

export default TimeBlock;