import React, { useState, useMemo, useCallback } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, parseISO, setHours, setMinutes, addMinutes, isBefore, isAfter, isEqual, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkHour } from '@/types';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/types';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData } from '@/types';
import { parseAppointmentText } from '@/integrations/supabase/api';
import DraggableAppointmentCard from './DraggableAppointmentCard';
import DraggableScheduleTaskItem from './DraggableScheduleTaskItem';
import AppointmentForm from './AppointmentForm';
import TimeBlockActionMenu from './TimeBlockActionMenu';
import { toast } from 'react-hot-toast';

interface ScheduleGridContentProps {
  currentDate: Date;
  appointments: Appointment[];
  tasks: Task[];
  workHours: WorkHour[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  showFocusTasksOnly: boolean;
  onAddAppointment: (data: NewAppointmentData) => Promise<Appointment>;
  onUpdateAppointment: (id: string, updates: UpdateAppointmentData) => Promise<Appointment>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
}

const ScheduleGridContent: React.FC<ScheduleGridContentProps> = ({
  currentDate,
  appointments,
  tasks,
  workHours,
  allCategories,
  allSections,
  showFocusTasksOnly,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
}) => {
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [prefilledAppointmentData, setPrefilledAppointmentData] = useState<Partial<NewAppointmentData>>({});
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates!,
    })
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutesInterval = 30; // Appointments can snap to 30-minute intervals

  const currentDayWorkHours = useMemo(() => {
    const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
    return workHours.find(wh => wh.day_of_week === dayOfWeek && wh.enabled);
  }, [currentDate, workHours]);

  const availableTasks = useMemo(() => {
    let filtered = tasks.filter(task => task.status === 'to-do' && !task.parent_task_id);
    if (showFocusTasksOnly) {
      filtered = filtered.filter(task =>
        allSections.some(section => section.id === task.section_id && section.include_in_focus_mode)
      );
    }
    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks, showFocusTasksOnly, allSections]);

  const unscheduledDoTodayTasks = useMemo(() => {
    const scheduledTaskIds = new Set(appointments.map(app => app.task_id).filter(Boolean));
    return availableTasks.filter(task => !scheduledTaskIds.has(task.id));
  }, [availableTasks, appointments]);

  const getGridRow = (time: Date) => {
    const hour = time.getHours();
    const minutes = time.getMinutes();
    return (hour * (60 / minutesInterval)) + (minutes / minutesInterval) + 1;
  };

  const handleTimeSlotClick = useCallback((hour: number, minute: number) => {
    const start = setMinutes(setHours(currentDate, hour), minute);
    const end = addMinutes(start, minutesInterval);
    setSelectedTimeSlot({ start, end });
    setEditingAppointment(null);
    setPrefilledAppointmentData({
      date: format(currentDate, 'yyyy-MM-dd'),
      start_time: format(start, 'HH:mm'),
      end_time: format(end, 'HH:mm'),
    });
    setIsAppointmentFormOpen(true);
  }, [currentDate]);

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedTimeSlot(null);
    setPrefilledAppointmentData({});
    setIsAppointmentFormOpen(true);
  }, []);

  const handleDragStart = (event: any) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) {
      setActiveDragItem(null);
      return;
    }

    const activeType = active.data.current?.type;
    const overId = String(over.id);

    // Dropping onto a time slot
    if (overId.startsWith('time-slot-')) {
      const [, hourStr, minuteStr] = overId.split('-');
      const targetHour = parseInt(hourStr);
      const targetMinute = parseInt(minuteStr);
      const newStartTime = setMinutes(setHours(currentDate, targetHour), targetMinute);
      const newEndTime = addMinutes(newStartTime, minutesInterval); // Default to 30 min duration

      if (activeType === 'appointment') {
        const draggedAppointment = active.data.current.appointment as Appointment;
        const updates: UpdateAppointmentData = {
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: format(newStartTime, 'HH:mm'),
          end_time: format(newEndTime, 'HH:mm'),
        };
        await onUpdateAppointment(draggedAppointment.id, updates);
        toast.success('Appointment rescheduled!');
      } else if (activeType === 'task') {
        const draggedTask = active.data.current.task as Task;
        const newAppointmentData: NewAppointmentData = {
          title: draggedTask.description,
          description: draggedTask.notes,
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: format(newStartTime, 'HH:mm'),
          end_time: format(newEndTime, 'HH:mm'),
          color: allCategories.find(cat => cat.id === draggedTask.category?.id)?.color || '#3b82f6',
          task_id: draggedTask.id,
        };
        await onAddAppointment(newAppointmentData);
        toast.success('Task scheduled as appointment!');
      }
    }
    setActiveDragItem(null);
  };

  const handleDrop = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    const activeType = active.data.current?.type;
    const overId = String(over.id);

    if (overId.startsWith('time-slot-')) {
      const [, hourStr, minuteStr] = overId.split('-');
      const targetHour = parseInt(hourStr);
      const targetMinute = parseInt(minuteStr);
      const newStartTime = setMinutes(setHours(currentDate, targetHour), targetMinute);
      const newEndTime = addMinutes(newStartTime, minutesInterval); // Default to 30 min duration

      if (activeType === 'appointment') {
        const draggedAppointment = active.data.current.appointment as Appointment;
        const updates: UpdateAppointmentData = {
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: format(newStartTime, 'HH:mm'),
          end_time: format(newEndTime, 'HH:mm'),
        };
        await onUpdateAppointment(draggedAppointment.id, updates);
        toast.success('Appointment rescheduled!');
      } else if (activeType === 'task') {
        const draggedTask = active.data.current.task as Task;
        const newAppointmentData: NewAppointmentData = {
          title: draggedTask.description,
          description: draggedTask.notes,
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: format(newStartTime, 'HH:mm'),
          end_time: format(newEndTime, 'HH:mm'),
          color: allCategories.find(cat => cat.id === draggedTask.category?.id)?.color || '#3b82f6',
          task_id: draggedTask.id,
        };
        await onAddAppointment(newAppointmentData);
        toast.success('Task scheduled as appointment!');
      }
    }
  };

  const getAppointmentTracks = (apps: Appointment[]) => {
    const tracks: Appointment[][] = [];
    apps.forEach(app => {
      const appStart = parseISO(`2000-01-01T${app.start_time}`);
      const appEnd = parseISO(`2000-01-01T${app.end_time}`);
      let placed = false;
      for (let i = 0; i < tracks.length; i++) {
        const conflict = tracks[i].some(existingApp => {
          const existingStart = parseISO(`2000-01-01T${existingApp.start_time}`);
          const existingEnd = parseISO(`2000-01-01T${existingApp.end_time}`);
          return (isBefore(appStart, existingEnd) && isAfter(appEnd, existingStart)) ||
                 (isEqual(appStart, existingStart) && isEqual(appEnd, existingEnd));
        });
        if (!conflict) {
          tracks[i].push(app);
          placed = true;
          break;
        }
      }
      if (!placed) {
        tracks.push([app]);
      }
    });
    return tracks;
  };

  const appointmentTracks = useMemo(() => getAppointmentTracks(appointments), [appointments]);
  const maxTracks = appointmentTracks.length > 0 ? Math.max(...appointmentTracks.map(track => track.length)) : 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
    >
      <div className="grid grid-cols-[60px_1fr_200px] gap-4 h-full">
        {/* Time Axis */}
        <div className="flex flex-col border-r pr-2">
          {hours.map(hour => (
            <div key={hour} className="relative h-[60px] text-right text-xs text-gray-500">
              {hour}:00
            </div>
          ))}
        </div>

        {/* Schedule Grid */}
        <div
          className="relative grid gap-px bg-gray-200 border rounded-md overflow-hidden"
          style={{
            gridTemplateRows: `repeat(${24 * (60 / minutesInterval)}, ${minutesInterval / 60 * 60}px)`,
            gridTemplateColumns: `repeat(${maxTracks}, 1fr)`,
          }}
        >
          {/* Grid Background (Clickable Time Slots) */}
          {hours.map(hour =>
            Array.from({ length: 60 / minutesInterval }, (_, minuteIndex) => {
              const minute = minuteIndex * minutesInterval;
              const timeSlotId = `time-slot-${hour}-${minute}`;
              const slotStart = setMinutes(setHours(currentDate, hour), minute);
              const slotEnd = addMinutes(slotStart, minutesInterval);

              const isWorkHour = currentDayWorkHours &&
                isAfter(slotStart, parseISO(`2000-01-01T${currentDayWorkHours.start_time}`)) &&
                isBefore(slotEnd, parseISO(`2000-01-01T${currentDayWorkHours.end_time}`));

              return (
                <div
                  key={timeSlotId}
                  id={timeSlotId}
                  className={`absolute w-full h-[${minutesInterval}px] border-b border-gray-200 cursor-pointer hover:bg-blue-50 ${isWorkHour ? 'bg-blue-50' : 'bg-white'}`}
                  style={{
                    gridRow: getGridRow(slotStart),
                    top: `${(hour * 60 + minute)}px`,
                    height: `${minutesInterval}px`,
                  }}
                  onClick={() => handleTimeSlotClick(hour, minute)}
                >
                  <div className="absolute top-1 right-1">
                    <TimeBlockActionMenu
                      onAddTask={onAddTask}
                      onAddAppointment={async (title, startTime, endTime, color, taskId) => {
                        const newApp: NewAppointmentData = {
                          title,
                          start_time: startTime,
                          end_time: endTime,
                          date: format(currentDate, 'yyyy-MM-dd'),
                          color,
                          task_id: taskId,
                          user_id: '', // Will be filled by hook
                        };
                        return await onAddAppointment(newApp);
                      }}
                      onEditAppointment={() => handleTimeSlotClick(hour, minute)}
                      onDeleteAppointment={() => {}}
                      availableTasks={availableTasks}
                      availableSections={allSections}
                      availableCategories={allCategories}
                      selectedDate={currentDate}
                      selectedTimeSlot={{ start: slotStart, end: slotEnd }}
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Appointments */}
          {appointmentTracks.map((track, trackIndex) =>
            track.map((app) => {
              const appStart = parseISO(`2000-01-01T${app.start_time}`);
              const appEnd = parseISO(`2000-01-01T${app.end_time}`);
              const durationMinutes = (appEnd.getTime() - appStart.getTime()) / (1000 * 60);

              const linkedTask = tasks.find(t => t.id === app.task_id);

              return (
                <DraggableAppointmentCard
                  key={app.id}
                  appointment={app}
                  task={linkedTask}
                  onEdit={handleAppointmentClick}
                  onUnschedule={onDeleteAppointment}
                  trackIndex={trackIndex}
                  totalTracks={appointmentTracks.length}
                  style={{
                    gridColumn: trackIndex + 1,
                    gridRow: `${getGridRow(appStart)} / span ${durationMinutes / minutesInterval}`,
                    top: `${appStart.getHours() * 60 + appStart.getMinutes()}px`,
                    height: `${durationMinutes}px`,
                    width: `calc(100% / ${appointmentTracks.length})`,
                    left: `${(100 / appointmentTracks.length) * trackIndex}%`,
                    position: 'absolute',
                  }}
                />
              );
            })
          )}
        </div>

        {/* Unscheduled Tasks */}
        <div className="flex flex-col p-2 border-l">
          <h3 className="text-lg font-semibold mb-2">Unscheduled Tasks</h3>
          <SortableContext items={unscheduledDoTodayTasks.map(task => `task-${task.id}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {unscheduledDoTodayTasks.map(task => (
                <DraggableScheduleTaskItem
                  key={task.id}
                  task={task}
                  categories={allCategories}
                  sections={allSections}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onAddSubtask={onAddSubtask}
                  onToggleFocusMode={onToggleFocusMode}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </div>

      <AppointmentForm
        isOpen={isAppointmentFormOpen}
        onClose={() => {
          setIsAppointmentFormOpen(false);
          setEditingAppointment(null);
          setSelectedTimeSlot(null);
          setPrefilledAppointmentData({});
        }}
        onSave={onAddAppointment} // This handles both add and update
        onDelete={onDeleteAppointment}
        initialData={editingAppointment || undefined}
        selectedDate={selectedDate}
        selectedTimeSlot={selectedTimeSlot}
        prefilledData={prefilledAppointmentData}
        tasks={tasks}
      />

      <DragOverlay>
        {activeDragItem?.type === 'task' && (
            <DraggableScheduleTaskItem
              task={activeDragItem.task}
              categories={allCategories}
              sections={allSections}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onAddSubtask={onAddSubtask}
              onToggleFocusMode={onToggleFocusMode}
            />
          )}
        {activeDragItem?.type === 'appointment' && (
          <DraggableAppointmentCard
            appointment={activeDragItem.appointment}
            task={tasks.find(t => t.id === activeDragItem.appointment.task_id)}
            onEdit={handleAppointmentClick}
            onUnschedule={onDeleteAppointment}
            trackIndex={activeDragItem.trackIndex}
            totalTracks={appointmentTracks.length}
            style={{}} // Style will be handled by DragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default ScheduleGridContent;