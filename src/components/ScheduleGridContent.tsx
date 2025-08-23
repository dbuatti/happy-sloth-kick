import React, { useState, useMemo, useCallback } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, parseISO, setHours, setMinutes, addMinutes, isBefore, isAfter, isEqual, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkHour, Appointment, NewAppointmentData, UpdateAppointmentData, Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData } from '@/types';
import { parseAppointmentText } from '@/integrations/supabase/api';
import DraggableAppointmentCard from './DraggableAppointmentCard';
import DraggableScheduleTaskItem from './DraggableScheduleTaskItem';
import AppointmentForm from './AppointmentForm';
import TimeBlockActionMenu from './TimeBlockActionMenu';
import { toast } from 'react-hot-toast';

interface ScheduleGridContentProps {
  currentDate: Date;
  workHours: WorkHour[];
  tasks: Task[];
  appointments: Appointment[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  onAddAppointment: (title: string, startTime: string, endTime: string, color: string, taskId?: string | null) => Promise<Appointment>;
  onUpdateAppointment: (id: string, updates: UpdateAppointmentData) => Promise<Appointment>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => Promise<Task>;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  onUpdateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
  showFocusTasksOnly: boolean;
  doTodayOffLog: Task['doTodayOffLog'];
}

const ScheduleGridContent: React.FC<ScheduleGridContentProps> = ({
  currentDate,
  workHours,
  tasks,
  appointments,
  allCategories,
  allSections,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  onUpdateSectionIncludeInFocusMode,
  showFocusTasksOnly,
  doTodayOffLog,
}) => {
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: Date; end: Date } | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates!,
    })
  );

  const currentDayOfWeek = format(currentDate, 'EEEE').toLowerCase();
  const activeWorkHour = useMemo(() => {
    return workHours.find(wh => wh.day_of_week === currentDayOfWeek && wh.enabled);
  }, [currentDate, workHours]);

  const timeBlocks = useMemo(() => {
    const blocks = [];
    const startHour = activeWorkHour ? parseInt(activeWorkHour.start_time.split(':')[0]) : 8;
    const endHour = activeWorkHour ? parseInt(activeWorkHour.end_time.split(':')[0]) : 20;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const start = setMinutes(setHours(currentDate, hour), minute);
        const end = addMinutes(start, 30);
        blocks.push({ start, end });
      }
    }
    return blocks;
  }, [currentDate, activeWorkHour]);

  const getAppointmentsForTimeBlock = useCallback((blockStart: Date, blockEnd: Date) => {
    return appointments.filter(app => {
      const appStart = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.start_time}`);
      const appEnd = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.end_time}`);
      return (isEqual(appStart, blockStart) || isBefore(appStart, blockEnd)) &&
             (isEqual(appEnd, blockEnd) || isAfter(appEnd, blockStart));
    });
  }, [appointments, currentDate]);

  const handleTimeSlotClick = useCallback((blockStart: Date, blockEnd: Date) => {
    setSelectedTimeSlot({ start: blockStart, end: blockEnd });
    setEditingAppointment(null);
    setIsAppointmentFormOpen(true);
  }, []);

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedTimeSlot({ start: parseISO(`${appointment.date}T${appointment.start_time}`), end: parseISO(`${appointment.date}T${appointment.end_time}`) });
    setIsAppointmentFormOpen(true);
  }, []);

  const handleSaveAppointment = async (data: NewAppointmentData | UpdateAppointmentData) => {
    if ('id' in data && data.id) {
      return await onUpdateAppointment(data.id, data);
    } else {
      return await onAddAppointment(data.title, data.start_time, data.end_time, data.color, data.task_id);
    }
  };

  const handleScheduleTask = async (task: Task, startTime: string, endTime: string) => {
    const newAppointmentData: NewAppointmentData = {
      title: task.description,
      description: task.notes,
      date: format(currentDate, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      color: allCategories.find(cat => cat.id === task.category)?.color || '#3b82f6',
      task_id: task.id,
    };
    await onAddAppointment(newAppointmentData.title, newAppointmentData.start_time, newAppointmentData.end_time, newAppointmentData.color, newAppointmentData.task_id);
    toast.success(`Task "${task.description}" scheduled!`);
  };

  const handleDragStart = (event: any) => {
    // Set active drag item data if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    const activeType = active.data.current?.type;
    const overTimeSlot = timeBlocks.find(block => block.start.toISOString() === String(over.id));

    if (!overTimeSlot) return;

    const newStartTime = format(overTimeSlot.start, 'HH:mm');
    const newEndTime = format(overTimeSlot.end, 'HH:mm');
    const newDate = format(currentDate, 'yyyy-MM-dd');

    if (activeType === 'appointment') {
      const draggedAppointment = active.data.current.appointment as Appointment;
      const updates: UpdateAppointmentData = {
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      };
      await onUpdateAppointment(draggedAppointment.id, updates);
      toast.success('Appointment rescheduled!');
    } else if (activeType === 'task') {
      const draggedTask = active.data.current.task as Task;
      const newAppointmentData: NewAppointmentData = {
        title: draggedTask.description,
        description: draggedTask.notes,
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
        color: allCategories.find(cat => cat.id === draggedTask.category)?.color || '#3b82f6',
        task_id: draggedTask.id,
      };
      await onAddAppointment(newAppointmentData.title, newAppointmentData.start_time, newAppointmentData.end_time, newAppointmentData.color, newAppointmentData.task_id);
      toast.success(`Task "${draggedTask.description}" scheduled!`);
    }
  };

  const handleDrop = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    const activeType = active.data.current?.type;
    const overTimeSlot = timeBlocks.find(block => block.start.toISOString() === String(over.id));

    if (!overTimeSlot) return;

    const newStartTime = format(overTimeSlot.start, 'HH:mm');
    const newEndTime = format(overTimeSlot.end, 'HH:mm');
    const newDate = format(currentDate, 'yyyy-MM-dd');

    if (activeType === 'appointment') {
      const draggedAppointment = active.data.current.appointment as Appointment;
      const updates: UpdateAppointmentData = {
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      };
      await onUpdateAppointment(draggedAppointment.id, updates);
      toast.success('Appointment rescheduled!');
    } else if (activeType === 'task') {
      const draggedTask = active.data.current.task as Task;
      const newAppointmentData: NewAppointmentData = {
        title: draggedTask.description,
        description: draggedTask.notes,
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
        color: allCategories.find(cat => cat.id === draggedTask.category)?.color || '#3b82f6',
        task_id: draggedTask.id,
      };
      await onAddAppointment(newAppointmentData.title, newAppointmentData.start_time, newAppointmentData.end_time, newAppointmentData.color, newAppointmentData.task_id);
      toast.success(`Task "${draggedTask.description}" scheduled!`);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
    >
      <div className="grid grid-cols-[50px_1fr] gap-x-2 h-full overflow-y-auto">
        {/* Time Axis */}
        <div className="sticky left-0 bg-background z-10">
          {timeBlocks.map((block, index) => (
            <div key={index} className="h-12 flex items-center justify-end pr-2 text-xs text-muted-foreground border-b">
              {format(block.start, 'HH:mm')}
            </div>
          ))}
        </div>

        {/* Schedule Grid */}
        <div className="relative">
          {timeBlocks.map((block, index) => {
            const blockAppointments = getAppointmentsForTimeBlock(block.start, block.end);
            return (
              <div
                key={index}
                id={block.start.toISOString()} // Use ISO string as droppable ID
                className="h-12 border-b border-l border-dashed flex items-center justify-center relative"
                onClick={() => handleTimeSlotClick(block.start, block.end)}
              >
                {blockAppointments.map((app, appIndex) => {
                  const appStart = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.start_time}`);
                  const appEnd = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.end_time}`);
                  const durationMinutes = differenceInMinutes(appEnd, appStart);
                  const offsetMinutes = differenceInMinutes(appStart, block.start);

                  // Calculate position and height relative to the current time block
                  const topOffsetPercentage = (offsetMinutes / 30) * 100;
                  const heightPercentage = (durationMinutes / 30) * 100;

                  const linkedTask = tasks.find(t => t.id === app.task_id);

                  return (
                    <DraggableAppointmentCard
                      key={app.id}
                      id={app.id}
                      appointment={app}
                      task={linkedTask}
                      onEdit={handleEditAppointment}
                      onDelete={onDeleteAppointment}
                      trackIndex={appIndex} // For potential overlapping appointments
                      totalTracks={blockAppointments.length}
                      style={{
                        position: 'absolute',
                        top: `${topOffsetPercentage}%`,
                        height: `${heightPercentage}%`,
                        left: 0,
                        right: 0,
                        zIndex: 10 + appIndex,
                      }}
                    />
                  );
                })}
                <div className="absolute top-1 right-1">
                  <TimeBlockActionMenu
                    block={block}
                    onAddAppointment={onAddAppointment}
                    onEditAppointment={handleEditAppointment}
                    onDeleteAppointment={onDeleteAppointment}
                    onScheduleTask={handleScheduleTask}
                    availableTasks={tasks}
                    availableSections={allSections}
                    availableCategories={allCategories}
                    selectedDate={currentDate}
                    selectedTimeSlot={{ start: block.start, end: block.end }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {selectedTimeSlot && editingAppointment && (
          <DraggableAppointmentCard
            id={editingAppointment.id}
            appointment={editingAppointment}
            task={tasks.find((t: Task) => t.id === editingAppointment.task_id)}
            onEdit={handleEditAppointment}
            onDelete={onDeleteAppointment}
            trackIndex={0}
            totalTracks={1}
            isDragging={true}
          />
        )}
        {/* Add DragOverlay for tasks if needed */}
      </DragOverlay>

      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            initialData={editingAppointment || undefined}
            onSave={handleSaveAppointment}
            onCancel={() => setIsAppointmentFormOpen(false)}
            tasks={tasks || []}
            selectedDate={currentDate}
            selectedTimeSlot={selectedTimeSlot}
          />
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};

export default ScheduleGridContent;