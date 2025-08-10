import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkHours } from '@/hooks/useWorkHours';
import { format, addMinutes, parse, isBefore, getMinutes, getHours, parseISO, isValid } from 'date-fns';
import { CalendarDays, Clock, Settings, Sparkles, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import DateNavigator from '@/components/DateNavigator';
import { useAppointments, Appointment, NewAppointmentData } from '@/hooks/useAppointments';
import AppointmentForm from '@/components/AppointmentForm';
import { useAuth } from '@/context/AuthContext';
import { useTasks, Task } from '@/hooks/useTasks';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { parseAppointmentText } from '@/integrations/supabase/api';
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import DraggableTaskListItem from '@/components/DraggableTaskListItem';
import DraggableAppointmentCard from '@/components/DraggableAppointmentCard';
import TimeBlock from '@/components/TimeBlock';
import { cn } from '@/lib/utils';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  useAuth(); 

  const [currentDate, setCurrentDate] = useState(new Date());
  const { workHours: singleDayWorkHoursRaw, loading: workHoursLoading } = useWorkHours({ date: currentDate, userId: demoUserId });
  const singleDayWorkHours = Array.isArray(singleDayWorkHoursRaw) ? null : singleDayWorkHoursRaw;

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments(currentDate);
  const { 
    tasks: allTasks,
    filteredTasks: allDayTasks, 
    allCategories, 
    sections, 
    updateTask, 
    deleteTask: deleteTaskFromHook,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode
  } = useTasks({ currentDate, userId: demoUserId });
  const { settings } = useSettings();

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlotForNew, setSelectedTimeSlotForNew] = useState<{ start: Date; end: Date } | null>(null);
  
  const [isParsingDialogOpen, setIsParsingDialogOpen] = useState(false);
  const [textToParse, setTextToParse] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDataForForm, setParsedDataForForm] = useState<Partial<NewAppointmentData> | null>(null);

  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  
  const [isTaskPanelCollapsed, setIsTaskPanelCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('scheduleTaskPanelCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('scheduleTaskPanelCollapsed', JSON.stringify(isTaskPanelCollapsed));
  }, [isTaskPanelCollapsed]);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  const handlePreviousDay = useCallback(() => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + 1);
      return newDate;
    });
  }, []);

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
  };
  useKeyboardShortcuts(shortcuts);

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

  const handleOpenAppointmentForm = (block: { start: Date; end: Date }) => {
    setEditingAppointment(null);
    setSelectedTimeSlotForNew(block);
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

  const handleAppointmentClick = (appointment: Appointment) => {
    if (appointment.task_id) {
      const task = allTasks.find(t => t.id === appointment.task_id);
      if (task) {
        setTaskToOverview(task);
        setIsTaskOverviewOpen(true);
      } else {
        handleEditAppointment(appointment);
      }
    } else {
      handleEditAppointment(appointment);
    }
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleDeleteAppointment = async (id: string) => {
    return await deleteAppointment(id);
  };

  const handleUnscheduleTask = async (appointmentId: string) => {
    const success = await deleteAppointment(appointmentId);
    if (success) {
      showSuccess("Task unscheduled successfully.");
    }
  };

  const handleClearDay = async () => {
    const deletedApps = await clearDayAppointments();
    if (deletedApps.length > 0) {
      toast.success('Day cleared.', {
        action: {
          label: 'Undo',
          onClick: () => handleUndoClear(deletedApps),
        },
      });
    }
  };

  const handleUndoClear = async (appsToRestore: Appointment[]) => {
    await batchAddAppointments(appsToRestore);
  };

  const rowHeight = 50;
  const gapHeight = 4;

  const getAppointmentGridPosition = useCallback((app: Appointment) => {
    if (!app.start_time || !app.end_time) {
      return { gridRowStart: 1, gridRowEnd: 1, overlapOffset: 0 };
    }
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

  const totalLoading = workHoursLoading || appointmentsLoading;

  const unscheduledDoTodayTasks = useMemo(() => {
    const scheduledTaskIds = new Set(
      appointments.map(app => app.task_id).filter(Boolean)
    );
    
    let tasksToDisplay = allDayTasks.filter(task => !scheduledTaskIds.has(task.id) && task.status === 'to-do');

    if (settings?.schedule_show_focus_tasks_only) {
      const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
      tasksToDisplay = tasksToDisplay.filter(task => {
        return task.section_id === null || focusModeSectionIds.has(task.section_id);
      });
    }

    return tasksToDisplay;
  }, [appointments, allDayTasks, settings?.schedule_show_focus_tasks_only, sections]);

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

  const handleParseText = async () => {
    if (!textToParse.trim()) {
      showError('Please paste some text to parse.');
      return;
    }
    setIsParsing(true);
    const loadingToastId = showLoading('Parsing appointment details...');
    const result = await parseAppointmentText(textToParse, currentDate);
    dismissToast(loadingToastId);
    setIsParsing(false);

    if (result) {
      showSuccess('Details parsed successfully!');
      setParsedDataForForm({
        title: result.title,
        description: result.description,
        date: result.date,
        start_time: `${result.startTime}:00`,
        end_time: `${result.endTime}:00`,
      });
      setIsParsingDialogOpen(false);
      setIsAppointmentFormOpen(true);
      setTextToParse('');
    } else {
      showError('Could not parse the text. Please check the format.');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over || !over.data.current) return;

    const overData = over.data.current;
    const activeData = active.data.current;

    if (overData.type !== 'time-block') return;

    const newStartTime = overData.time as Date;

    if (activeData?.type === 'task') {
      const task = activeData.task as Task;
      handleScheduleTask(task.id, newStartTime);
    } else if (activeData?.type === 'appointment') {
      const appointment = activeData.appointment as Appointment;
      const duration = activeData.duration as number;
      const newEndTime = addMinutes(newStartTime, duration);

      updateAppointment(appointment.id, {
        start_time: format(newStartTime, 'HH:mm:ss'),
        end_time: format(newEndTime, 'HH:mm:ss'),
        date: format(newStartTime, 'yyyy-MM-dd'),
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-xl p-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                  <CalendarDays className="h-7 w-7" /> Dynamic Schedule
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleClearDay} disabled={appointments.length === 0 || isDemo}>
                    <X className="mr-2 h-4 w-4" /> Clear Day
                  </Button>
                  <Button variant="outline" onClick={() => setIsParsingDialogOpen(true)} disabled={isDemo}>
                    <Sparkles className="mr-2 h-4 w-4" /> Parse from Text
                  </Button>
                </div>
              </div>
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
                <div className={cn(
                  "grid grid-cols-1 gap-6 transition-all duration-300",
                  isTaskPanelCollapsed ? "lg:grid-cols-[1fr_auto]" : "lg:grid-cols-[1fr_300px]"
                )}>
                  <div className="grid grid-cols-[80px_1fr] gap-x-4">
                    <div className="relative" style={{
                      height: `${timeBlocks.length * rowHeight + (timeBlocks.length > 0 ? (timeBlocks.length - 1) * gapHeight : 0)}px`,
                    }}>
                      {timeBlocks.map((block, index) => (
                        getMinutes(block.start) === 0 && (
                          <div
                            key={`label-${format(block.start, 'HH:mm')}`}
                            className="absolute right-4"
                            style={{ top: `${index * (rowHeight + gapHeight) - 8}px` }}
                          >
                            <span className="text-xs text-muted-foreground">{format(block.start, 'h a')}</span>
                          </div>
                        )
                      ))}
                    </div>

                    <div className="relative grid" style={{
                      gridTemplateRows: `repeat(${timeBlocks.length}, ${rowHeight}px)`,
                      rowGap: `${gapHeight}px`,
                      height: `${timeBlocks.length * rowHeight + (timeBlocks.length > 0 ? (timeBlocks.length - 1) * gapHeight : 0)}px`,
                    }}>
                      {timeBlocks.map((block, index) => (
                        getMinutes(block.start) === 0 && (
                          <div
                            key={`bg-label-${format(block.start, 'HH')}`}
                            className="absolute inset-x-0 h-full flex items-center justify-center text-[120px] font-bubbly font-bold text-gray-200/50 dark:text-gray-800/50 select-none pointer-events-none"
                            style={{
                              top: `${index * (rowHeight + gapHeight)}px`,
                              height: `${2 * rowHeight + gapHeight}px`,
                              zIndex: 0,
                            }}
                          >
                            <span>{format(block.start, 'h:00')}</span>
                          </div>
                        )
                      ))}

                      {timeBlocks.map((block, index) => (
                        <TimeBlock
                          key={`block-${format(block.start, 'HH:mm')}`}
                          block={block}
                          index={index}
                          appointmentsWithPositions={appointmentsWithPositions}
                          isDemo={isDemo}
                          onAddAppointment={handleOpenAppointmentForm}
                          onScheduleTask={handleScheduleTask}
                          unscheduledTasks={unscheduledDoTodayTasks}
                          sections={sections}
                          currentDate={currentDate}
                        />
                      ))}

                      {appointmentsWithPositions.map((app) => {
                        const task = app.task_id ? allTasks.find(t => t.id === app.task_id) : undefined;
                        return (
                          <DraggableAppointmentCard
                            key={app.id}
                            appointment={app}
                            task={task}
                            onEdit={handleAppointmentClick}
                            onUnschedule={handleUnscheduleTask}
                            gridRowStart={app.gridRowStart}
                            gridRowEnd={app.gridRowEnd}
                            overlapOffset={app.overlapOffset}
                            rowHeight={rowHeight}
                            gapHeight={gapHeight}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsTaskPanelCollapsed(!isTaskPanelCollapsed)}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-background hover:bg-muted rounded-full h-8 w-8 border"
                      aria-label={isTaskPanelCollapsed ? "Show task panel" : "Hide task panel"}
                    >
                      {isTaskPanelCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
                    </Button>
                    {!isTaskPanelCollapsed && (
                      <div className="space-y-4 lg:w-[300px]">
                        <h3 className="text-lg font-semibold">Unscheduled Tasks</h3>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto p-1">
                          {unscheduledDoTodayTasks.length > 0 ? (
                            unscheduledDoTodayTasks.map(task => (
                              <DraggableTaskListItem key={task.id} task={task} />
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No tasks to schedule.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
            setParsedDataForForm(null);
          }}
          onSave={handleSaveAppointment}
          onDelete={handleDeleteAppointment}
          initialData={editingAppointment}
          selectedDate={currentDate}
          selectedTimeSlot={selectedTimeSlotForNew}
          prefilledData={parsedDataForForm}
        />
        {taskToOverview && (
          <TaskOverviewDialog
            task={taskToOverview}
            isOpen={isTaskOverviewOpen}
            onClose={() => setIsTaskOverviewOpen(false)}
            onEditClick={handleEditTaskFromOverview}
            onUpdate={updateTask}
            onDelete={deleteTaskFromHook}
            sections={sections}
            allCategories={allCategories}
            allTasks={allTasks}
          />
        )}
        {taskToEdit && (
          <TaskDetailDialog
            task={taskToEdit}
            isOpen={isTaskDetailOpen}
            onClose={() => setIsTaskDetailOpen(false)}
            onUpdate={updateTask}
            onDelete={deleteTaskFromHook}
            sections={sections}
            allCategories={allCategories}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />
        )}
        <Dialog open={isParsingDialogOpen} onOpenChange={setIsParsingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Parse Appointment from Text</DialogTitle>
              <DialogDescription>
                Paste your appointment details below (e.g., "meeting at 3pm for 1 hour" or a confirmation email) and we'll try to fill out the form for you.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="text-to-parse">Appointment Text</Label>
              <Textarea
                id="text-to-parse"
                value={textToParse}
                onChange={(e) => setTextToParse(e.target.value)}
                rows={10}
                placeholder="Paste text here..."
                disabled={isParsing}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsParsingDialogOpen(false)} disabled={isParsing}>Cancel</Button>
              <Button onClick={handleParseText} disabled={isParsing || !textToParse.trim()}>
                {isParsing ? 'Parsing...' : 'Parse and Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeDragItem?.type === 'task' && (
              <div className="p-2 rounded-md bg-primary text-primary-foreground shadow-lg">
                <p className="font-semibold text-sm">{activeDragItem.task.description}</p>
              </div>
            )}
            {activeDragItem?.type === 'appointment' && (() => {
              const startTime = activeDragItem.appointment.start_time ? parseISO(`2000-01-01T${activeDragItem.appointment.start_time}`) : null;
              const endTime = activeDragItem.appointment.end_time ? parseISO(`2000-01-01T${activeDragItem.appointment.end_time}`) : null;
              return (
                <div className="rounded-lg p-2 shadow-md text-white" style={{ backgroundColor: activeDragItem.appointment.color, width: '200px' }}>
                  <h4 className="font-semibold text-sm truncate">{activeDragItem.appointment.title}</h4>
                  <p className="text-xs opacity-90">
                    {startTime && endTime && isValid(startTime) && isValid(endTime) ? `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}` : 'Invalid time'}
                  </p>
                </div>
              );
            })()}
          </DragOverlay>,
          document.body
        )}
      </div>
    </DndContext>
  );
};

export default TimeBlockSchedule;