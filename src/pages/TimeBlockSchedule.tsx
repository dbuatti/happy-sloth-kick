import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkHours } from '@/hooks/useWorkHours';
import { format, addMinutes, parse, isBefore, isSameHour, isSameMinute, setHours, setMinutes, getMinutes, getHours, isSameDay } from 'date-fns';
import { CalendarDays, Clock, Settings } from 'lucide-react'; // Added Settings icon
import DateNavigator from '@/components/DateNavigator';
import { cn } from '@/lib/utils';
import { useAppointments, Appointment, NewAppointmentData } from '@/hooks/useAppointments';
import AppointmentForm from '@/components/AppointmentForm';
import AppointmentCard from '@/components/AppointmentCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

const TimeBlockSchedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Pass currentDate to useWorkHours to get hours for the specific day
  const { workHours: singleDayWorkHoursRaw, loading: workHoursLoading } = useWorkHours({ date: currentDate });
  // Explicitly narrow the type for singleDayWorkHours
  const singleDayWorkHours = Array.isArray(singleDayWorkHoursRaw) ? null : singleDayWorkHoursRaw;

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment } = useAppointments(currentDate);

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlotForNew, setSelectedTimeSlotForNew] = useState<{ start: Date; end: Date } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null); // Fixed: Initialized activeId to null

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + 1);
      return newDate;
    });
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const timeBlocks = useMemo(() => {
    // Ensure singleDayWorkHours is treated as a single WorkHour object
    const workHours = singleDayWorkHours; // Already narrowed by the type guard above

    if (!workHours || !workHours.enabled) return [];

    const startTime = parse(workHours.start_time, 'HH:mm:ss', currentDate);
    const endTime = parse(workHours.end_time, 'HH:mm:ss', currentDate);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.error("Error parsing start or end time. Check format:", workHours.start_time, workHours.end_time);
      return [];
    }

    const blocks = [];
    let currentTime = startTime;
    while (isBefore(currentTime, endTime)) {
      const blockStart = currentTime;
      const blockEnd = addMinutes(currentTime, 30);
      blocks.push({
        start: blockStart,
        end: blockEnd,
      });
      currentTime = blockEnd;
    }
    return blocks;
  }, [singleDayWorkHours, currentDate]); // Depend on singleDayWorkHours

  const handleTimeBlockClick = (blockStart: Date, blockEnd: Date) => {
    console.log('Time block clicked:', format(blockStart, 'HH:mm'), format(blockEnd, 'HH:mm'));
    setEditingAppointment(null); // Ensure we're adding, not editing
    setSelectedTimeSlotForNew({ start: blockStart, end: blockEnd });
    setIsAppointmentFormOpen(true);
    console.log('isAppointmentFormOpen set to true');
  };

  const handleSaveAppointment = async (data: NewAppointmentData) => {
    if (editingAppointment) {
      return await updateAppointment(editingAppointment.id, data);
    } else {
      return await addAppointment(data);
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedTimeSlotForNew(null); // Clear any pre-selected time slot
    setIsAppointmentFormOpen(true);
  };

  const handleDeleteAppointment = async (id: string) => {
    return await deleteAppointment(id); // Return the boolean result from deleteAppointment
  };

  const getAppointmentGridPosition = useCallback((app: Appointment) => {
    const appStartTime = parse(app.start_time, 'HH:mm:ss', currentDate);
    const appEndTime = parse(app.end_time, 'HH:mm:ss', currentDate);

    // Ensure singleDayWorkHours is treated as a single WorkHour object
    const workHours = singleDayWorkHours; // Already narrowed by the type guard above

    if (!workHours || !workHours.enabled || isNaN(appStartTime.getTime()) || isNaN(appEndTime.getTime())) {
      return { gridRowStart: 1, gridRowEnd: 1, overlapOffset: 0 };
    }

    const workStartTime = parse(workHours.start_time, 'HH:mm:ss', currentDate);

    const startMinutes = (getHours(appStartTime) * 60) + getMinutes(appStartTime);
    const endMinutes = (getHours(appEndTime) * 60) + getMinutes(appEndTime);
    const workStartMinutes = (getHours(workStartTime) * 60) + getMinutes(workStartTime);

    // Calculate row start based on minutes from work start time, divided by 30-min intervals
    const gridRowStart = Math.floor((startMinutes - workStartMinutes) / 30) + 1;
    const gridRowEnd = Math.ceil((endMinutes - workStartMinutes) / 30) + 1;

    return { gridRowStart, gridRowEnd };
  }, [singleDayWorkHours, currentDate]); // Depend on singleDayWorkHours

  const appointmentsWithPositions = useMemo(() => {
    const positionedApps = appointments.map(app => ({
      ...app,
      ...getAppointmentGridPosition(app),
    }));

    // Simple overlap detection and offset calculation
    // This is a basic approach; for complex layouts, a dedicated library might be needed.
    const sortedApps = [...positionedApps].sort((a, b) => {
      if (a.gridRowStart !== b.gridRowStart) return a.gridRowStart - b.gridRowStart;
      return a.gridRowEnd - b.gridRowEnd;
    });

    const finalApps = sortedApps.map(app => ({ ...app, overlapOffset: 0 }));

    for (let i = 0; i < finalApps.length; i++) {
      for (let j = i + 1; j < finalApps.length; j++) {
        const appA = finalApps[i];
        const appB = finalApps[j];

        // Check for overlap
        const overlaps = (appA.gridRowStart < appB.gridRowEnd && appB.gridRowStart < appA.gridRowEnd);

        if (overlaps) {
          // If they overlap, give the second appointment an offset
          appB.overlapOffset = appA.overlapOffset + 1;
        }
      }
    }
    return finalApps;
  }, [appointments, getAppointmentGridPosition]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const draggedAppointment = appointments.find(app => app.id === active.id);
    if (!draggedAppointment) {
      setActiveId(null);
      return;
    }

    // Determine the new start time based on where it was dropped
    // The 'over' ID will be the ID of the time block (e.g., 'time-block-8:00')
    // or another appointment.
    let newStartTime: Date | null = null;
    if (typeof over.id === 'string' && over.id.startsWith('time-block-')) {
      const timeString = over.id.replace('time-block-', ''); // e.g., "09:00"
      newStartTime = parse(timeString, 'HH:mm', currentDate);
    } else if (over.data.current?.type === 'appointment') {
      // If dropped on another appointment, use its start time
      const overAppointment = appointments.find(app => app.id === over.id);
      if (overAppointment) {
        newStartTime = parse(overAppointment.start_time, 'HH:mm:ss', currentDate);
      }
    }

    // Ensure singleDayWorkHours is treated as a single WorkHour object
    const workHours = singleDayWorkHours; // Already narrowed by the type guard above

    if (newStartTime && workHours && workHours.enabled) {
      const originalDurationMinutes = (parse(draggedAppointment.end_time, 'HH:mm:ss', currentDate).getTime() - parse(draggedAppointment.start_time, 'HH:mm:ss', currentDate).getTime()) / (1000 * 60);
      const newEndTime = addMinutes(newStartTime, originalDurationMinutes);

      // Ensure new times are within work hours
      const workStart = parse(workHours.start_time, 'HH:mm:ss', currentDate);
      const workEnd = parse(workHours.end_time, 'HH:mm:ss', currentDate);

      if (isBefore(newStartTime, workStart) || isBefore(workEnd, newEndTime)) {
        alert('Appointment cannot be moved outside of work hours.');
        setActiveId(null);
        return;
      }

      await updateAppointment(draggedAppointment.id, {
        start_time: format(newStartTime, 'HH:mm:ss'),
        end_time: format(newEndTime, 'HH:mm:ss'),
        date: format(currentDate, 'yyyy-MM-dd'), // Ensure date is current date
      });
    }
    setActiveId(null);
  };

  const activeAppointment = activeId ? appointments.find(app => app.id === activeId) : null;

  const totalLoading = workHoursLoading || appointmentsLoading;

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <CalendarDays className="h-7 w-7" /> Dynamic Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DateNavigator
              currentDate={currentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onGoToToday={handleGoToToday}
              setCurrentDate={setCurrentDate}
            />

            {totalLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (!singleDayWorkHours || !singleDayWorkHours.enabled) ? ( // Check singleDayWorkHours
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <Clock className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No work hours set or enabled for this day.</p>
                <p className="text-sm">Please go to <a href="/settings" className="text-blue-500 hover:underline flex items-center gap-1">
                  <Settings className="h-4 w-4" /> Settings
                </a> to define your work hours.</p>
              </div>
            ) : timeBlocks.length === 0 ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <Clock className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No time blocks generated.</p>
                <p className="text-sm">Please check your work hour settings for this day.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[60px_1fr] gap-x-2"> {/* Main grid for time labels and schedule */}
                {/* Left column for time labels */}
                <div className="grid" style={{
                  gridTemplateRows: `repeat(${timeBlocks.length}, 48px)`, // Each 30 min block is 48px
                  height: `${timeBlocks.length * 48 + (timeBlocks.length > 0 ? (timeBlocks.length - 1) * 4 : 0)}px`, // Account for gaps
                }}>
                  {timeBlocks.map((block, index) => (
                    // Only show label for every hour
                    getMinutes(block.start) === 0 && (
                      <div
                        key={`label-${format(block.start, 'HH:mm')}`}
                        className="flex items-start justify-end pr-2 text-xs text-muted-foreground"
                        style={{ gridRow: `${index + 1} / span 2` }} // Span 2 30-min blocks (1 hour)
                      >
                        <span>{format(block.start, 'h a')}</span>
                      </div>
                    )
                  ))}
                </div>

                {/* Right column for time blocks and appointments */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="relative grid gap-1" style={{
                    gridTemplateRows: `repeat(${timeBlocks.length}, 48px)`, // Each 30 min block is 48px
                    height: `${timeBlocks.length * 48 + (timeBlocks.length > 0 ? (timeBlocks.length - 1) * 4 : 0)}px`, // Account for gaps
                  }}>
                    {timeBlocks.map((block, index) => (
                      <div
                        key={format(block.start, 'HH:mm')}
                        id={`time-block-${format(block.start, 'HH:mm')}`} // ID for drag target
                        className="relative flex items-center justify-center h-12 bg-card dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-dashed border-border/50 hover:border-primary/50 transition-all duration-150 cursor-pointer hover:scale-[1.01] hover:shadow-md"
                        style={{ gridRow: `${index + 1}` }} // Each block is now a single row
                        onClick={() => handleTimeBlockClick(block.start, block.end)}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-5xl font-extrabold text-foreground opacity-10 pointer-events-none select-none">
                          {format(block.start, 'h:mm')}
                        </span>
                      </div>
                    ))}

                    <SortableContext
                      items={appointments.map(app => app.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {appointmentsWithPositions.map((app) => (
                        <AppointmentCard
                          key={app.id}
                          appointment={app}
                          onEdit={handleEditAppointment}
                          onDelete={handleDeleteAppointment}
                          gridRowStart={app.gridRowStart}
                          gridRowEnd={app.gridRowEnd}
                          overlapOffset={app.overlapOffset}
                        />
                      ))}
                    </SortableContext>

                    <DragOverlay>
                      {activeAppointment ? (
                        <AppointmentCard
                          appointment={activeAppointment}
                          onEdit={handleEditAppointment}
                          onDelete={handleDeleteAppointment}
                          gridRowStart={1} // Dummy values for overlay
                          gridRowEnd={2}   // Dummy values for overlay
                          overlapOffset={0}
                        />
                      ) : null}
                    </DragOverlay>
                  </div>
                </DndContext>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
      <AppointmentForm
        isOpen={isAppointmentFormOpen}
        onClose={() => {
          setIsAppointmentFormOpen(false);
          setEditingAppointment(null); // Clear editing state on close
          setSelectedTimeSlotForNew(null); // Clear selected slot on close
        }}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment} // Pass the onDelete function
        initialData={editingAppointment}
        selectedDate={currentDate}
        selectedTimeSlot={selectedTimeSlotForNew}
      />
    </div>
  );
};

export default TimeBlockSchedule;