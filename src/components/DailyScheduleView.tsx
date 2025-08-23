import React, { useState, useMemo, useCallback } from 'react';
import { format, startOfDay, addMinutes, isBefore, isAfter, isEqual, parseISO, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Appointment, WorkHour, Task, TaskCategory, TaskSection, UserSettings, DailyScheduleViewProps, NewAppointmentData, UpdateAppointmentData, NewTaskData, UpdateTaskData, DoTodayOffLogEntry } from '@/types';
import TaskItem from './tasks/TaskItem';
import AppointmentForm from './AppointmentForm';
import TimeBlockActionMenu from './TimeBlockActionMenu';
import DraggableAppointmentCard from './DraggableAppointmentCard';
import DraggableScheduleTaskItem from './DraggableScheduleTaskItem';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-hot-toast';

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
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
  const [activeDragItem, setActiveDragItem] = useState<{ type: 'task' | 'appointment'; task?: Task; appointment?: Appointment } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates!,
    })
  );

  const currentDayOfWeek = format(currentDate, 'EEEE').toLowerCase();
  const activeWorkHour = useMemo(() => {
    return workHours.find((wh: WorkHour) => wh.day_of_week === currentDayOfWeek && (wh.enabled ?? true));
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

  const availableTasks = useMemo(() => {
    let filtered = tasks.filter((task: Task) => task.status === 'to-do' && !task.parent_task_id);
    if (showFocusTasksOnly) {
      filtered = filtered.filter((task: Task) =>
        allSections.some((section: TaskSection) => section.id === task.section_id && (section.include_in_focus_mode ?? true))
      );
    }
    return filtered.sort((a: Task, b: Task) => (a.order || 0) - (b.order || 0));
  }, [tasks, showFocusTasksOnly, allSections]);

  const unscheduledDoTodayTasks = useMemo(() => {
    const scheduledTaskIds = new Set(appointments.map((app: Appointment) => app.task_id).filter(Boolean));
    return availableTasks.filter((task: Task) => !scheduledTaskIds.has(task.id));
  }, [availableTasks, appointments]);

  const getAppointmentsForTimeBlock = useCallback((blockStart: Date, blockEnd: Date) => {
    return appointments.filter(app => {
      const appStart = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.start_time}`);
      const appEnd = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.end_time}`);
      return (isEqual(appStart, blockStart) || isBefore(appStart, blockEnd)) &&
             (isEqual(appEnd, blockEnd) || isAfter(appEnd, blockStart));
    });
  }, [appointments, currentDate]);

  const handleTimeSlotClick = useCallback((hour: number, minute: number) => {
    const start = addMinutes(startOfDay(currentDate), hour * 60 + minute);
    const end = addMinutes(start, 30);
    setSelectedTimeSlot({ start, end });
    setEditingAppointment(null);
    setIsAppointmentFormOpen(true);
  }, [currentDate]);

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedTimeSlot({ start: parseISO(`${appointment.date}T${appointment.start_time}`), end: parseISO(`${appointment.date}T${appointment.end_time}`) });
    setIsAppointmentFormOpen(true);
  }, []);

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (active.data.current?.type === 'task') {
      setActiveDragItem({ type: 'task', task: active.data.current.task });
    } else if (active.data.current?.type === 'appointment') {
      setActiveDragItem({ type: 'appointment', appointment: active.data.current.appointment });
    }
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
        color: allCategories.find((cat: TaskCategory) => cat.id === draggedTask.category)?.color || '#3b82f6',
        task_id: draggedTask.id,
      };
      await onAddAppointment(newAppointmentData.title, newAppointmentData.start_time, newAppointmentData.end_time, newAppointmentData.color, newAppointmentData.task_id);
      toast.success(`Task "${draggedTask.description}" scheduled!`);
    }
    setActiveDragItem(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 flex flex-col h-full">
          <h3 className="text-xl font-semibold mb-4">Schedule for {format(currentDate, 'PPP')}</h3>
          <div className="grid grid-cols-[50px_1fr] gap-x-2 flex-1 overflow-y-auto">
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
                    onClick={() => handleTimeSlotClick(block.start.getHours(), block.start.getMinutes())}
                  >
                    {blockAppointments.map((app, appIndex) => {
                      const appStart = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.start_time}`);
                      const appEnd = parseISO(`${format(currentDate, 'yyyy-MM-dd')}T${app.end_time}`);
                      const durationMinutes = differenceInMinutes(appEnd, appStart);
                      const offsetMinutes = differenceInMinutes(appStart, block.start);

                      // Calculate position and height relative to the current time block
                      const topOffsetPercentage = (offsetMinutes / 30) * 100;
                      const heightPercentage = (durationMinutes / 30) * 100;

                      const linkedTask = tasks.find((t: Task) => t.id === app.task_id);

                      return (
                        <DraggableAppointmentCard
                          key={app.id}
                          id={app.id}
                          appointment={app}
                          task={linkedTask}
                          onEdit={handleAppointmentClick}
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
                        onEditAppointment={handleAppointmentClick}
                        onDeleteAppointment={onDeleteAppointment}
                        onScheduleTask={async (task, startTime, endTime) => {
                          await onAddAppointment(task.description, startTime, endTime, allCategories.find(cat => cat.id === task.category)?.color || '#3b82f6', task.id);
                        }}
                        availableTasks={availableTasks}
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
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unscheduled Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {unscheduledDoTodayTasks.length === 0 ? (
                <p className="text-muted-foreground">All tasks are scheduled or no tasks available.</p>
              ) : (
                <SortableContext items={unscheduledDoTodayTasks.map((task: Task) => `task-${task.id}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {unscheduledDoTodayTasks.map((task: Task) => (
                      <DraggableScheduleTaskItem
                        key={task.id}
                        id={`task-${task.id}`}
                        task={task}
                        categories={allCategories}
                        sections={allSections}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        onAddSubtask={onAddSubtask}
                        onToggleFocusMode={onToggleFocusMode}
                        onLogDoTodayOff={onLogDoTodayOff}
                        doTodayOffLog={doTodayOffLog}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DragOverlay>
        {activeDragItem?.type === 'appointment' && activeDragItem.appointment && (
          <DraggableAppointmentCard
            id={activeDragItem.appointment.id}
            appointment={activeDragItem.appointment}
            task={tasks.find((t: Task) => t.id === activeDragItem.appointment.task_id)}
            onEdit={handleAppointmentClick}
            onDelete={onDeleteAppointment}
            trackIndex={0}
            totalTracks={1}
            isDragging={true}
          />
        )}
        {activeDragItem?.type === 'task' && activeDragItem.task && (
          <DraggableScheduleTaskItem
            id={activeDragItem.task.id}
            task={activeDragItem.task}
            categories={allCategories}
            sections={allSections}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            doTodayOffLog={doTodayOffLog}
            isDragging={true}
          />
        )}
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

export default DailyScheduleView;