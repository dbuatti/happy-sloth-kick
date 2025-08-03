import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkHours } from '@/hooks/useWorkHours';
import { format, addMinutes, parse, isBefore, getMinutes, getHours } from 'date-fns';
import { CalendarDays, Clock, Settings } from 'lucide-react';
import DateNavigator from '@/components/DateNavigator';
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
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TimeBlockSchedule: React.FC = () => {
  useAuth(); 

  const [currentDate, setCurrentDate] = useState(new Date());
  const { workHours: singleDayWorkHoursRaw, loading: workHoursLoading } = useWorkHours({ date: currentDate });
  const singleDayWorkHours = Array.isArray(singleDayWorkHoursRaw) ? null : singleDayWorkHoursRaw;

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment } = useAppointments(currentDate);
  const { filteredTasks: allDayTasks, allCategories } = useTasks({ currentDate });

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlotForNew, setSelectedTimeSlotForNew] = useState<{ start: Date; end: Date } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

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
      return new Date();
    });
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const timeBlocks = useMemo(() => {
    const workHours = singleDayWorkHours;

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
  }, [singleDayWorkHours, currentDate]);

  const handleTimeBlockClick = (blockStart: Date, blockEnd: Date) => {
    setEditingAppointment(null);
    setSelectedTimeSlotForNew({ start: blockStart, end: blockEnd });
    setIsAppointmentFormOpen(true);
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
    setSelectedTimeSlotForNew(null);
    setIsAppointmentFormOpen(true);
  };

  const handleDeleteAppointment = async (id: string) => {
    return await deleteAppointment(id);
  };

  const rowHeight = 40;
  const gapHeight = 4;

  const getAppointmentGridPosition = useCallback((app: Appointment) => {
    const appStartTime = parse(app.start_time, 'HH:mm:ss', currentDate);
    const appEndTime = parse(app.end_time, 'HH:mm:ss', currentDate);

    const workHours = singleDayWorkHours;

    if (!workHours || !workHours.enabled || isNaN(appStartTime.getTime()) || isNaN(appEndTime.getTime())) {
      return { gridRowStart: 1, gridRowEnd: 1, overlapOffset: 0 };
    }

    const workStartTime = parse(workHours.start_time, 'HH:mm:ss', currentDate);

    const startMinutes = (getHours(appStartTime) * 60) + getMinutes(appStartTime);
    const endMinutes = (getHours(appEndTime) * 60) + getMinutes(appEndTime);
    const workStartMinutes = (getHours(workStartTime) * 60) + getMinutes(workStartTime);

    const gridRowStart = Math.floor((startMinutes - workStartMinutes) / 30) + 1;
    const gridRowEnd = Math.ceil((endMinutes - workStartMinutes) / 30) + 1;

    return { gridRowStart, gridRowEnd };
  }, [singleDayWorkHours, currentDate]);

  const appointmentsWithPositions = useMemo(() => {
    const positionedApps = appointments.map(app => ({
      ...app,
      ...getAppointmentGridPosition(app),
    }));

    const sortedApps = [...positionedApps].sort((a, b) => {
      if (a.gridRowStart !== b.gridRowStart) return a.gridRowStart - b.gridRowStart;
      return a.gridRowEnd - b.gridRowEnd;
    });

    const finalApps = sortedApps.map(app => ({ ...app, overlapOffset: 0 }));

    for (let i = 0; i < finalApps.length; i++) {
      for (let j = i + 1; j < finalApps.length; j++) {
        const appA = finalApps[i];
        const appB = finalApps[j];

        const overlaps = (appA.gridRowStart < appB.gridRowEnd && appB.gridRowStart < appA.gridRowEnd);

        if (overlaps) {
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

    let newStartTime: Date | null = null;
    if (typeof over.id === 'string' && over.id.startsWith('time-block-')) {
      const timeString = over.id.replace('time-block-', '');
      newStartTime = parse(timeString, 'HH:mm', currentDate);
    } else if (over.data.current?.type === 'appointment') {
      const overAppointment = appointments.find(app => app.id === over.id);
      if (overAppointment) {
        newStartTime = parse(overAppointment.start_time, 'HH:mm:ss', currentDate);
      }
    }

    const workHours = singleDayWorkHours;

    if (newStartTime && workHours && workHours.enabled) {
      const originalDurationMinutes = (parse(draggedAppointment.end_time, 'HH:mm:ss', currentDate).getTime() - parse(draggedAppointment.start_time, 'HH:mm:ss', currentDate).getTime()) / (1000 * 60);
      const newEndTime = addMinutes(newStartTime, originalDurationMinutes);

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
        date: format(currentDate, 'yyyy-MM-dd'),
      });
    }
    setActiveId(null);
  };

  const activeAppointment = activeId ? appointments.find(app => app.id === activeId) : null;

  const totalLoading = workHoursLoading || appointmentsLoading;

  const unscheduledDoTodayTasks = useMemo(() => {
    const scheduledTaskIds = new Set(
      appointments.map(app => app.task_id).filter(Boolean)
    );
    return allDayTasks.filter(task => !scheduledTaskIds.has(task.id) && task.status === 'to-do');
  }, [appointments, allDayTasks]);

  const handleScheduleTask = async (taskId: string, blockStart: Date) => {
    const task = allDayTasks.find(t => t.id === taskId);
    if (!task) return;

    const category = allCategories.find(c => c.id === task.category);

    const newAppointment: NewAppointmentData = {
      title: task.description,
      description: task.notes,
      date: format(currentDate, 'yyyy-MM-dd'),
      start_time: format(blockStart, 'HH:mm:ss'),
      end_time: format(addMinutes(blockStart, 30), 'HH:mm:ss'),
      color: category?.color || '#3b82f6',
      task_id: task.id,
    };

    await addAppointment(newAppointment);
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
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
            ) : (!singleDayWorkHours || !singleDayWorkHours.enabled) ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-medium mb-2">No work hours set or enabled for this day.</p>
                <p className="text-md">Please go to <a href="/my-hub" className="text-blue-500 hover:underline flex items-center gap-1">
                  <Settings className="h-4 w-4" /> My Hub (Settings tab)
                </a> to define your work hours to start scheduling!</p>
              </div>
            ) : timeBlocks.length === 0 ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-medium mb-2">No time blocks generated for this day.</p>
                <p className="text-sm">Please check your work hour settings. Ensure your start time is before your end time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] lg:grid-cols-[120px_1fr] gap-x-2">
                <div className="grid" style={{
                  gridTemplateRows: `repeat(${timeBlocks.length}, ${rowHeight}px)`,
                  height: `${timeBlocks.length * rowHeight + (timeBlocks.length > 0 ? (timeBlocks.length - 1) * gapHeight : 0)}px`,
                }}>
                  {timeBlocks.map((block, index) => (
                    getMinutes(block.start) === 0 && (
                      <div
                        key={`label-${format(block.start, 'HH:mm')}`}
                        className="flex items-start justify-end pr-2 text-xs sm:text-sm text-muted-foreground"
                        style={{ gridRow: `${index + 1} / span 2` }}
                      >
                        <span>{format(block.start, 'h a')}</span>
                      </div>
                    )
                  ))}
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="relative grid gap-1" style={{
                    gridTemplateRows: `repeat(${timeBlocks.length}, ${rowHeight}px)`,
                    height: `${timeBlocks.length * rowHeight + (timeBlocks.length > 0 ? (timeBlocks.length - 1) * gapHeight : 0)}px`,
                  }}>
                    {timeBlocks.map((block, index) => {
                      const isBlockOccupied = appointmentsWithPositions.some(app => {
                        const appStart = parse(app.start_time, 'HH:mm:ss', currentDate);
                        const appEnd = parse(app.end_time, 'HH:mm:ss', currentDate);
                        return block.start.getTime() >= appStart.getTime() && block.start.getTime() < appEnd.getTime();
                      });

                      if (isBlockOccupied) {
                        return <div key={`occupied-${format(block.start, 'HH:mm')}`} className="h-10" style={{ gridRow: `${index + 1}` }} />;
                      }

                      return (
                        <div
                          key={`select-${format(block.start, 'HH:mm')}`}
                          className="relative flex items-center justify-center h-10"
                          style={{ gridRow: `${index + 1}` }}
                        >
                          <Select onValueChange={(taskId) => handleScheduleTask(taskId, block.start)}>
                            <SelectTrigger className="w-full h-full bg-card dark:bg-gray-800 rounded-xl shadow-sm border-dashed border-border/50 hover:border-primary/50 transition-colors duration-150">
                              <SelectValue placeholder="Schedule a task..." />
                            </SelectTrigger>
                            <SelectContent>
                              {unscheduledDoTodayTasks.length > 0 ? (
                                unscheduledDoTodayTasks.map(task => (
                                  <SelectItem key={task.id} value={task.id}>
                                    {task.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground">No 'Do Today' tasks available.</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}

                    <SortableContext
                      items={appointments.map(app => app.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {appointmentsWithPositions.map((app) => (
                        <AppointmentCard
                          key={app.id}
                          appointment={app}
                          onEdit={handleEditAppointment}
                          gridRowStart={app.gridRowStart}
                          gridRowEnd={app.gridRowEnd}
                          overlapOffset={app.overlapOffset}
                          rowHeight={rowHeight}
                          gapHeight={gapHeight}
                          isOverlay={false}
                        />
                      ))}
                    </SortableContext>

                    <DragOverlay>
                      {activeAppointment ? (
                        <AppointmentCard
                          appointment={activeAppointment}
                          onEdit={handleEditAppointment}
                          gridRowStart={1}
                          gridRowEnd={2}
                          overlapOffset={0}
                          rowHeight={rowHeight}
                          gapHeight={gapHeight}
                          isOverlay={true}
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
          setEditingAppointment(null);
          setSelectedTimeSlotForNew(null);
        }}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        initialData={editingAppointment}
        selectedDate={currentDate}
        selectedTimeSlot={selectedTimeSlotForNew}
      />
    </div>
  );
};

export default TimeBlockSchedule;