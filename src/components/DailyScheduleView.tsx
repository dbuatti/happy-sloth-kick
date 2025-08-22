import React, { useState, useMemo } from 'react';
import { format, addDays, startOfDay, setHours, setMinutes, isSameDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Appointment, Task, TaskSection, TaskCategory, WorkHour, TaskStatus } from '@/types/task';
import AppointmentForm from './AppointmentForm';
import ScheduleGridContent from './ScheduleGridContent';
import { DailyScheduleViewProps } from '@/types/props';
import { cn } from '@/lib/utils';

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  isDemo,
  onOpenTaskOverview,
  currentViewDate: initialViewDate,
  allWorkHours,
  saveWorkHours,
  appointments,
  tasks,
  sections,
  allCategories, // Renamed from categories to allCategories for consistency
  addAppointment,
  updateAppointment,
  deleteAppointment,
  onAddTask,
  onUpdate, // Renamed from onUpdateTask to onUpdate for consistency
  onOpenTaskDetail,
  isLoading,
  onDelete, // Added from TaskActionProps
  onReorderTasks, // Added from TaskActionProps
  onStatusChange, // Added from TaskActionProps
  createSection, // Added from TaskManagementProps
  updateSection, // Added from TaskManagementProps
  deleteSection, // Added from TaskManagementProps
  updateSectionIncludeInFocusMode, // Added from TaskManagementProps
  createCategory, // Added from TaskManagementProps
  updateCategory, // Added from TaskManagementProps
  deleteCategory, // Added from TaskManagementProps
}) => {
  const [currentViewDate, setCurrentViewDate] = useState(initialViewDate);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const daysInGrid = useMemo(() => {
    const start = startOfWeek(currentViewDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentViewDate]);

  const timeBlocks = useMemo(() => {
    const blocks = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        blocks.push({
          start: setMinutes(setHours(startOfDay(new Date()), hour), minute),
          end: setMinutes(setHours(startOfDay(new Date()), hour), minute + 30),
        });
      }
    }
    return blocks;
  }, []);

  const unscheduledTasks = useMemo(() => {
    const scheduledTaskIds = new Set(appointments.filter(app => app.task_id).map(app => app.task_id));
    return tasks.filter(task => task.status === 'to-do' && !scheduledTaskIds.has(task.id));
  }, [tasks, appointments]);

  const handleAddAppointment = async (data: Partial<Appointment>) => {
    await addAppointment(data);
    setIsAppointmentFormOpen(false);
    setEditingAppointment(null);
  };

  const handleUpdateAppointment = async (id: string, data: Partial<Appointment>) => {
    await updateAppointment(id, data);
    setIsAppointmentFormOpen(false);
    setEditingAppointment(null);
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointment(id);
    setIsAppointmentFormOpen(false);
    setEditingAppointment(null);
  };

  const handleScheduleTask = async (taskId: string, blockStart: Date) => {
    const taskToSchedule = tasks.find(t => t.id === taskId);
    if (taskToSchedule) {
      await addAppointment({
        title: taskToSchedule.description,
        description: taskToSchedule.notes,
        date: format(blockStart, 'yyyy-MM-dd'),
        start_time: format(blockStart, 'HH:mm:ss'),
        end_time: format(setHours(setMinutes(blockStart, blockStart.getMinutes() + 30), blockStart.getHours()), 'HH:mm:ss'), // Default 30 min
        color: '#3b82f6', // Default blue
        task_id: taskToSchedule.id,
      });
    }
  };

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading schedule...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentViewDate(prev => addDays(prev, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(startOfWeek(currentViewDate, { weekStartsOn: 1 }), 'MMM d')} - {format(addDays(startOfWeek(currentViewDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
        </h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentViewDate(prev => addDays(prev, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-8 gap-1 flex-grow overflow-auto">
        {/* Time Column Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-gray-200 dark:border-gray-700"></div>
        {/* Day Headers */}
        {daysInGrid.map(day => (
          <div
            key={format(day, 'yyyy-MM-dd')}
            className={cn(
              'sticky top-0 bg-background z-10 text-center font-medium py-2 border-b border-gray-200 dark:border-gray-700',
              isSameDay(day, new Date()) && 'text-blue-600'
            )}
          >
            {format(day, 'EEE d')}
          </div>
        ))}

        {/* Time Blocks */}
        {timeBlocks.map((block, blockIndex) => (
          <React.Fragment key={blockIndex}>
            <div className="sticky left-0 bg-background z-10 text-right text-xs text-gray-500 pr-2 h-16 flex items-start pt-1 border-b border-gray-200 dark:border-gray-700">
              {block.start.getMinutes() === 0 && format(block.start, 'h a')}
            </div>
            {daysInGrid.map(day => (
              <ScheduleGridContent
                key={format(day, 'yyyy-MM-dd')}
                day={day}
                timeBlocks={[{ start: setHours(setMinutes(startOfDay(day), block.start.getMinutes()), block.start.getHours()), end: setHours(setMinutes(startOfDay(day), block.end.getMinutes()), block.end.getHours()) }]}
                appointments={appointments}
                tasks={tasks}
                sections={sections}
                onAddAppointment={(b) => {
                  setEditingAppointment({
                    id: '', user_id: '', title: '', description: null,
                    date: format(b.start, 'yyyy-MM-dd'),
                    start_time: format(b.start, 'HH:mm:ss'),
                    end_time: format(b.end, 'HH:mm:ss'),
                    color: '#3b82f6', created_at: '', updated_at: '', task_id: null
                  });
                  setIsAppointmentFormOpen(true);
                }}
                onScheduleTask={handleScheduleTask}
                onOpenAppointmentDetail={(app) => {
                  setEditingAppointment(app);
                  setIsAppointmentFormOpen(true);
                }}
                onOpenTaskDetail={onOpenTaskDetail}
                unscheduledTasks={unscheduledTasks}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      {isAppointmentFormOpen && (
        <AppointmentForm
          appointment={editingAppointment}
          onSave={editingAppointment ? (data) => handleUpdateAppointment(editingAppointment.id, data) : handleAddAppointment}
          onCancel={() => { setIsAppointmentFormOpen(false); setEditingAppointment(null); }}
          onDelete={handleDeleteAppointment}
          tasks={tasks}
          sections={sections}
          allCategories={allCategories}
          currentDate={currentViewDate}
        />
      )}
    </div>
  );
};

export default DailyScheduleView;