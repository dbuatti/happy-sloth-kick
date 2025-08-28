import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO, setHours, setMinutes, addMinutes, differenceInMinutes, isSameDay, isBefore, isAfter } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';
import ScheduleHeader from './schedule/ScheduleHeader';
import ScheduleGrid from './schedule/ScheduleGrid';
import ScheduleItem from './schedule/ScheduleItem';
import { ScheduleEvent } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { ListTodo, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface DailyScheduleViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskOverview: (task: Task) => void;
}

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  currentDate,
  setCurrentDate,
  isDemo = false,
  demoUserId,
  onOpenTaskOverview,
}) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings } = useSettings();
  const isMobile = useIsMobile();

  const {
    appointments,
    loading: appointmentsLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    clearDayAppointments,
  } = useAppointments({ startDate: currentDate, endDate: currentDate, userId: userId });

  const {
    tasks: allTasks, // All tasks for subtask filtering
    processedTasks, // Processed tasks including virtual recurring tasks
    sections,
    allCategories,
    updateTask,
    deleteTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    loading: tasksLoading,
  } = useTasks({ viewMode: 'daily', userId: userId, currentDate: currentDate });

  const [activeDragItem, setActiveDragItem] = useState<ScheduleEvent | Task | null>(null);
  const [isDraggingUnscheduledTask, setIsDraggingUnscheduledTask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const scheduledEvents: ScheduleEvent[] = useMemo(() => {
    const events: ScheduleEvent[] = [...appointments];

    // Filter tasks that are explicitly scheduled (have a corresponding appointment)
    const scheduledTaskIds = new Set(appointments.filter(app => app.task_id).map(app => app.task_id));
    
    // Add tasks that are linked to appointments
    allTasks.forEach(task => {
      if (scheduledTaskIds.has(task.id)) {
        // Find the corresponding appointment and merge relevant task data
        const appointment = appointments.find(app => app.task_id === task.id);
        if (appointment) {
          // Create a new object that looks like an appointment but has task details
          events.push({
            ...appointment,
            title: task.description || appointment.title, // Prefer task description
            description: task.notes || appointment.description, // Prefer task notes
            task_id: task.id,
          });
        }
      }
    });

    return events.sort((a, b) => {
      const aTime = parseISO(`2000-01-01T${'start_time' in a ? a.start_time : '00:00:00'}`);
      const bTime = parseISO(`2000-01-01T${'start_time' in b ? b.start_time : '00:00:00'}`);
      return aTime.getTime() - bTime.getTime();
    });
  }, [appointments, allTasks]);

  const unscheduledTasks = useMemo(() => {
    const scheduledTaskIds = new Set(appointments.filter(app => app.task_id).map(app => app.task_id));
    
    let filtered = processedTasks.filter(task => 
      task.status === 'to-do' &&
      task.parent_task_id === null && // Only top-level tasks
      !scheduledTaskIds.has(task.id) // Not already scheduled
    );

    if (settings?.schedule_show_focus_tasks_only) {
      const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
      filtered = filtered.filter(task => {
        const isInFocusArea = task.section_id === null || focusModeSectionIds.has(task.section_id);
        const isDoToday = task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id);
        return isInFocusArea && isDoToday;
      });
    }

    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [processedTasks, appointments, settings?.schedule_show_focus_tasks_only, sections, doTodayOffIds]);

  const handleDropEvent = useCallback(async (eventId: string, newTime: Date, newDurationMinutes: number) => {
    if (isDemo) {
      toast.info("Demo mode: Cannot modify schedule.");
      return;
    }

    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const newStartTime = format(newTime, 'HH:mm:ss');
    const newEndTime = format(addMinutes(newTime, newDurationMinutes), 'HH:mm:ss');

    const existingAppointment = appointments.find(app => app.id === eventId);
    const existingTask = unscheduledTasks.find(task => task.id === eventId);

    if (existingAppointment) {
      // Update existing appointment
      await updateAppointment({
        id: existingAppointment.id,
        updates: {
          date: formattedDate,
          start_time: newStartTime,
          end_time: newEndTime,
        },
      });
    } else if (existingTask) {
      // Create new appointment from unscheduled task
      await addAppointment({
        title: existingTask.description || 'Untitled Task',
        description: existingTask.notes,
        date: formattedDate,
        start_time: newStartTime,
        end_time: newEndTime,
        color: allCategories.find(cat => cat.id === existingTask.category)?.color || 'hsl(var(--primary))',
        task_id: existingTask.id,
      });
    } else {
      toast.error('Could not find event to schedule.');
    }
  }, [currentDate, appointments, unscheduledTasks, addAppointment, updateAppointment, isDemo, allCategories]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = scheduledEvents.find(e => e.id === active.id) || unscheduledTasks.find(t => t.id === active.id);
    if (item) {
      setActiveDragItem(item);
      setIsDraggingUnscheduledTask(unscheduledTasks.some(t => t.id === active.id));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    setIsDraggingUnscheduledTask(false);
    const { active, over } = event;

    if (!over || !activeDragItem) return;

    const droppedOnHour = over.data.current?.hour;
    const droppedOnType = over.data.current?.type;

    if (droppedOnType === 'schedule-slot' && droppedOnHour !== undefined) {
      const newStartTime = setMinutes(setHours(currentDate, droppedOnHour), 0); // Snap to the hour
      let newDurationMinutes = 60; // Default to 1 hour

      if ('start_time' in activeDragItem && 'end_time' in activeDragItem) {
        const oldStart = parseISO(`2000-01-01T${activeDragItem.start_time}`);
        const oldEnd = parseISO(`2000-01-01T${activeDragItem.end_time}`);
        newDurationMinutes = differenceInMinutes(oldEnd, oldStart);
      }

      await handleDropEvent(activeDragItem.id, newStartTime, newDurationMinutes);
    }
  };

  const handleEditAppointment = useCallback((event: ScheduleEvent) => {
    if ('task_id' in event && event.task_id) {
      // It's a scheduled task, open task overview
      const task = allTasks.find(t => t.id === event.task_id);
      if (task) {
        onOpenTaskOverview(task);
      } else {
        toast.error('Associated task not found.');
      }
    } else {
      // It's a pure appointment, open appointment edit dialog (not implemented yet, but placeholder)
      toast.info('Editing pure appointments is not yet implemented.');
      console.log('Edit pure appointment:', event);
    }
  }, [allTasks, onOpenTaskOverview]);

  const handleDeleteAppointment = useCallback(async (id: string) => {
    if (isDemo) {
      toast.info("Demo mode: Cannot delete appointments.");
      return;
    }
    await deleteAppointment(id);
  }, [deleteAppointment, isDemo]);

  const handleClearDay = useCallback(async (date: Date) => {
    if (isDemo) {
      toast.info("Demo mode: Cannot clear day.");
      return;
    }
    await clearDayAppointments(date);
  }, [clearDayAppointments, isDemo]);

  const loading = appointmentsLoading || tasksLoading;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 h-full">
        {/* Unscheduled Tasks Panel */}
        <div className="flex flex-col border rounded-lg p-4 bg-card shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" /> Unscheduled Tasks
          </h3>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : unscheduledTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No unscheduled tasks for today.</p>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-2">
                {unscheduledTasks.map(task => (
                  <div
                    key={task.id}
                    id={task.id}
                    className={cn(
                      "flex items-center gap-2 p-2 border rounded-md bg-background hover:bg-muted/50 cursor-grab",
                      "text-sm font-medium text-foreground transition-colors duration-150 ease-in-out"
                    )}
                    data-dnd-type="unscheduled-task"
                    data-dnd-item={JSON.stringify(task)}
                    {...useSensor(PointerSensor).listeners} // Attach listeners for dragging
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-grow truncate">{task.description}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenTaskOverview(task)}>
                      <ListTodo className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Schedule Grid */}
        <div className="flex flex-col">
          <ScheduleHeader
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onClearDay={handleClearDay}
            onAddAppointment={addAppointment}
            isDemo={isDemo}
          />
          <div className="flex-1 overflow-y-auto">
            <ScheduleGrid
              currentDate={currentDate}
              appointments={scheduledEvents}
              onEditEvent={handleEditAppointment}
              onDeleteEvent={handleDeleteAppointment}
              onDropEvent={handleDropEvent}
              loading={loading}
              isDemo={isDemo}
            />
          </div>
        </div>
      </div>

      {createPortal(
        <DragOverlay>
          {activeDragItem ? (
            <ScheduleItem
              event={activeDragItem as ScheduleEvent}
              onEdit={() => {}}
              onDelete={() => {}}
              isOverlay
              isScheduledTask={isDraggingUnscheduledTask}
            />
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default DailyScheduleView;