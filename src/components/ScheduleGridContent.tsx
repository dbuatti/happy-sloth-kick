import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { format, addMinutes, parse, isBefore, getMinutes, getHours, parseISO, isValid, setHours, setMinutes, isSameDay, isAfter, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sparkles, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { WorkHour } from '@/hooks/useWorkHours';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { parseAppointmentText } from '@/integrations/supabase/api';
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast';

import AppointmentForm from '@/components/AppointmentForm';
import DraggableAppointmentCard from '@/components/DraggableAppointmentCard';
import DraggableScheduleTaskItem from '@/components/DraggableScheduleTaskItem';
import TimeBlockActionMenu from '@/components/TimeBlockActionMenu';

interface ScheduleGridContentProps {
  isDemo?: boolean;
  onOpenTaskOverview: (task: Task) => void;

  // Data from parent view (Daily/Weekly)
  currentViewDate: Date;
  daysInGrid: Date[];
  timeBlocks: { start: Date; end: Date }[]; // This prop is still used for its type, but the value is not directly read
  
  // Data from hooks (passed down)
  allWorkHours: WorkHour[];
  saveWorkHours: (hoursToSave: WorkHour | WorkHour[]) => Promise<boolean>;
  appointments: Appointment[];
  addAppointment: (newAppointment: NewAppointmentData) => Promise<Appointment | null>;
  updateAppointment: (id: string, updates: UpdateAppointmentData) => Promise<Appointment | null>;
  deleteAppointment: (id: string) => Promise<boolean>;
  clearDayAppointments: (dateToClear: Date) => Promise<Appointment[]>;
  batchAddAppointments: (appointmentsToRestore: Appointment[]) => Promise<boolean>;
  allTasks: Task[];
  allDayTasks: Task[];
  allCategories: Category[];
  sections: TaskSection[];
  settings: any;

  // Loading states
  isLoading: boolean;
}

const rowHeight = 50;
const gapHeight = 4;
const headerHeight = 80; // Fixed height for the header row

const ScheduleGridContent: React.FC<ScheduleGridContentProps> = ({
  isDemo = false,
  onOpenTaskOverview,
  currentViewDate,
  daysInGrid,
  timeBlocks: _initialTimeBlocks, // Renamed to _initialTimeBlocks and ignored
  allWorkHours,
  saveWorkHours,
  appointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  clearDayAppointments,
  batchAddAppointments,
  allTasks,
  allDayTasks,
  allCategories,
  sections,
  settings,
  isLoading,
}) => {
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlotForNew, setSelectedTimeSlotForNew] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date>(currentViewDate);

  const [isParsingDialogOpen, setIsParsingDialogOpen] = useState(false);
  const [textToParse, setTextToParse] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDataForForm, setParsedDataForForm] = useState<Partial<NewAppointmentData> | null>(null);

  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  
  const [isTaskPanelCollapsed, setIsTaskPanelCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('scheduleTaskPanelCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isClearDayDialogOpen, setIsClearDayDialogOpen] = useState(false);
  const [dayToClear, setDayToClear] = useState<Date | null>(null);
  const [isExtendHoursDialogOpen, setIsExtendHoursDialogOpen] = useState(false);
  const [newHoursToExtend, setNewHoursToExtend] = useState<{ min: number; max: number } | null>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<NewAppointmentData | null>(null);


  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  const getWorkHoursForDay = useCallback((date: Date) => {
    const dayOfWeekString = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const workHour = allWorkHours.find(wh => wh.day_of_week === dayOfWeekString);
    // Only return workHour if it's explicitly enabled for the day
    return workHour && workHour.enabled ? workHour : null;
  }, [allWorkHours]);

  // Generate time blocks for the full 24 hours to simplify grid row calculations
  const timeBlocks = useMemo(() => {
    const blocks = [];
    let currentTime = setHours(setMinutes(currentViewDate, 0), 0); // Start from 00:00
    const endTime = setHours(setMinutes(currentViewDate, 0), 24); // End at 24:00 (next day 00:00)

    while (currentTime.getTime() < endTime.getTime()) {
      const blockStart = currentTime;
      const blockEnd = addMinutes(currentTime, 30);
      blocks.push({
        start: blockStart,
        end: blockEnd,
      });
      currentTime = blockEnd;
    }
    return blocks;
  }, [currentViewDate]);

  const handleOpenAppointmentForm = (block: { start: Date; end: Date }, date: Date) => {
    setEditingAppointment(null);
    setSelectedTimeSlotForNew(block);
    setSelectedDateForNew(date);
    setIsAppointmentFormOpen(true);
  };

  const handleSaveAppointment = async (data: NewAppointmentData) => {
    const appDate = parseISO(data.date);
    const appStartTime = parse(data.start_time, 'HH:mm:ss', appDate);
    const appEndTime = parse(data.end_time, 'HH:mm:ss', appDate);

    const workHoursForAppDay = getWorkHoursForDay(appDate);

    const currentMinHour = workHoursForAppDay ? getHours(parse(workHoursForAppDay.start_time, 'HH:mm:ss', appDate)) : 0;
    const currentMaxHour = workHoursForAppDay ? getHours(parse(workHoursForAppDay.end_time, 'HH:mm:ss', appDate)) : 24;

    const appStartHour = getHours(appStartTime);
    const appEndHour = getHours(appEndTime) + (getMinutes(appEndTime) > 0 ? 1 : 0); // Round up to next hour if minutes exist

    const requiresExtension = appStartHour < currentMinHour || appEndHour > currentMaxHour;

    if (requiresExtension && !isDemo) {
      setNewHoursToExtend({
        min: Math.min(currentMinHour, appStartHour),
        max: Math.max(currentMaxHour, appEndHour),
      });
      setPendingAppointmentData(data);
      setIsExtendHoursDialogOpen(true);
      return false; // Prevent immediate save
    }

    if (editingAppointment) {
      return await updateAppointment(editingAppointment.id, data);
    } else {
      return await addAppointment(data);
    }
  };

  const confirmExtendHours = async () => {
    if (newHoursToExtend && pendingAppointmentData) {
      const appDate = parseISO(pendingAppointmentData.date);
      const workHoursForAppDay = getWorkHoursForDay(appDate);

      const updatedWorkHours: WorkHour = {
        ...(workHoursForAppDay || { day_of_week: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][appDate.getDay()], enabled: true }),
        start_time: format(setHours(appDate, newHoursToExtend.min), 'HH:mm:ss'),
        end_time: format(setHours(appDate, newHoursToExtend.max), 'HH:mm:ss'),
        enabled: true,
      };
      await saveWorkHours(updatedWorkHours);
      setIsExtendHoursDialogOpen(false);
      setNewHoursToExtend(null);
      if (pendingAppointmentData) {
        // Now save the pending appointment
        if (editingAppointment) {
          await updateAppointment(editingAppointment.id, pendingAppointmentData);
        } else {
          await addAppointment(pendingAppointmentData);
        }
        setPendingAppointmentData(null);
        setIsAppointmentFormOpen(false); // Close form after successful save
      }
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedTimeSlotForNew(null);
    setSelectedDateForNew(parseISO(appointment.date));
    setIsAppointmentFormOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    if (appointment.task_id) {
      const task = allTasks.find(t => t.id === appointment.task_id);
      if (task) {
        onOpenTaskOverview(task);
      } else {
        handleEditAppointment(appointment);
      }
    } else {
      handleEditAppointment(appointment);
    }
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

  const handleClearDayClick = (date: Date) => {
    setDayToClear(date);
    setIsClearDayDialogOpen(true);
  };

  const handleClearDay = async () => {
    if (!dayToClear) return;
    const deletedApps = await clearDayAppointments(dayToClear);
    if (deletedApps.length > 0) {
      toast.success(`Cleared ${format(dayToClear, 'MMM d')}.`, {
        action: {
          label: 'Undo',
          onClick: () => batchAddAppointments(deletedApps),
        },
      });
    }
    setIsClearDayDialogOpen(false);
    setDayToClear(null);
  };

  const appointmentsWithPositions = useMemo(() => {
    const positionedApps = appointments.map(app => {
      const dayIndex = daysInGrid.findIndex(day => isSameDay(day, parseISO(app.date)));
      if (dayIndex === -1) return null;

      const appDate = parseISO(app.date);
      const appStartTime = parse(app.start_time, 'HH:mm:ss', appDate);
      const appEndTime = parse(app.end_time, 'HH:mm:ss', appDate);

      if (!isValid(appStartTime) || !isValid(appEndTime)) {
        return null;
      }

      // Find the starting grid row based on timeBlocks
      const startBlockIndex = timeBlocks.findIndex(block =>
          getHours(block.start) === getHours(appStartTime) && getMinutes(block.start) === getMinutes(appStartTime)
      );

      if (startBlockIndex === -1) {
          // If the appointment start time doesn't exactly match a time block,
          // find the closest preceding block or handle as needed.
          // For simplicity, let's just return null for now if it doesn't align perfectly.
          return null;
      }

      const gridRowStart = startBlockIndex + 2; // +2 for header row and 1-based indexing
      const durationInMinutes = differenceInMinutes(appEndTime, appStartTime);
      const durationInBlocks = durationInMinutes / 30;
      const gridRowEnd = gridRowStart + durationInBlocks;

      return {
        ...app,
        gridColumn: dayIndex + 1, // +1 for time label column
        gridRowStart,
        gridRowEnd,
      };
    }).filter(Boolean) as (Appointment & { gridColumn: number; gridRowStart: number; gridRowEnd: number; })[];

    const finalApps = positionedApps.map(app => ({ ...app, overlapOffset: 0 }));

    daysInGrid.forEach((_, dayIndex) => {
      const appsForThisDay = finalApps.filter(app => app.gridColumn === dayIndex + 1)
                                      .sort((a, b) => a.gridRowStart - b.gridRowStart);
      
      for (let i = 0; i < appsForThisDay.length; i++) {
        for (let j = i + 1; j < appsForThisDay.length; j++) {
          const appA = appsForThisDay[i];
          const appB = appsForThisDay[j];

          // Check for overlap in grid rows
          const overlaps = (appA.gridRowStart < appB.gridRowEnd && appB.gridRowStart < appA.gridRowEnd);

          if (overlaps) {
            appB.overlapOffset = appA.overlapOffset + 1;
          }
        }
      }
    });
    return finalApps;
  }, [appointments, daysInGrid, timeBlocks, getWorkHoursForDay]);

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

  const handleScheduleTask = async (taskId: string, blockStart: Date, targetDate: Date) => {
    const task = allDayTasks.find(t => t.id === taskId);
    if (!task) return;

    const category = allCategories.find(c => c.id === task.category);

    const newAppointment: NewAppointmentData = {
      title: task.description || '',
      description: task.notes,
      date: format(targetDate, 'yyyy-MM-dd'),
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
    const result = await parseAppointmentText(textToParse, selectedDateForNew);
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
    const targetDate = overData.date as Date;

    if (activeData?.type === 'task') {
      const task = activeData.task as Task;
      handleScheduleTask(task.id, newStartTime, targetDate);
    } else if (activeData?.type === 'appointment') {
      const appointment = activeData.appointment as Appointment;
      const duration = activeData.duration as number;
      const newEndTime = addMinutes(newStartTime, duration);

      updateAppointment(appointment.id, {
        start_time: format(newStartTime, 'HH:mm:ss'),
        end_time: format(newEndTime, 'HH:mm:ss'),
        date: format(targetDate, 'yyyy-MM-dd'),
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
          {/* This space is for DateNavigator in DailyView or WeeklyDateNavigator in WeeklyView */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleClearDayClick(currentViewDate)} disabled={appointments.length === 0 || isDemo}>
              <X className="mr-2 h-4 w-4" /> Clear Day
            </Button>
            <Button variant="outline" onClick={() => setIsParsingDialogOpen(true)} disabled={isDemo}>
              <Sparkles className="mr-2 h-4 w-4" /> Parse from Text
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] lg:gap-6">
            <div className="flex-1 overflow-x-auto">
              <div className="grid border rounded-lg min-w-max relative" style={{ // Added relative positioning here
                gridTemplateColumns: `minmax(60px, auto) repeat(${daysInGrid.length}, minmax(120px, 1fr))`, // Added first column for time labels
                gridTemplateRows: `${headerHeight}px repeat(${timeBlocks.length}, ${rowHeight}px)`, // Fixed header height
                rowGap: `${gapHeight}px`,
              }}>
                {/* Top-left empty corner */}
                <div className="p-2 border-b border-r bg-muted/30 h-full" style={{ gridColumn: 1, gridRow: 1 }}></div>

                {/* Header Row: Days */}
                {daysInGrid.map((day, index) => {
                  return (
                    <div key={index} className="p-2 border-b text-center font-semibold text-sm flex flex-col items-center justify-center bg-muted/30 h-full">
                      <span>{format(day, 'EEE')}</span>
                      <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
                    </div>
                  );
                })}

                {/* Grid Cells for each day and time block */}
                {timeBlocks.map((block, blockIndex) => (
                  <React.Fragment key={`time-row-${blockIndex}`}>
                    {/* Time Label Column */}
                    <div className="p-2 border-b border-r text-right text-xs font-medium text-muted-foreground flex items-center justify-end bg-muted/30" style={{ gridColumn: 1, gridRow: blockIndex + 2, height: `${rowHeight}px` }}>
                      {getMinutes(block.start) === 0 && format(block.start, 'h a')}
                    </div>

                    {daysInGrid.map((day, dayIndex) => {
                      const workHoursForDay = getWorkHoursForDay(day); // This now returns null if not enabled
                      const isWorkDayEnabled = !!workHoursForDay; // Check if work hours are defined and enabled for the day

                      const minHour = workHoursForDay ? getHours(parse(workHoursForDay.start_time, 'HH:mm:ss', day)) : 0;
                      const maxHour = workHoursForDay ? getHours(parse(workHoursForDay.end_time, 'HH:mm:ss', day)) : 24;

                      const blockStartWithDate = setHours(setMinutes(day, getMinutes(block.start)), getHours(block.start));
                      const blockEndWithDate = addMinutes(blockStartWithDate, 30);

                      // Check if the block falls within the defined work hours
                      const isWithinDefinedWorkHours = isWorkDayEnabled && 
                        !isBefore(blockStartWithDate, setHours(setMinutes(day, 0), minHour)) &&
                        !isAfter(blockEndWithDate, setHours(setMinutes(day, 0), maxHour));

                      const isBlockOccupied = appointmentsWithPositions.some(app => {
                        if (!app.start_time || !app.end_time || !isSameDay(parseISO(app.date), day)) return false;
                        const appStart = parse(app.start_time, 'HH:mm:ss', day);
                        const appEnd = parse(app.end_time, 'HH:mm:ss', day);
                        return blockStartWithDate.getTime() >= appStart.getTime() && blockStartWithDate.getTime() < appEnd.getTime();
                      });

                      return (
                        <div
                          key={`${format(day, 'yyyy-MM-dd')}-${format(block.start, 'HH:mm')}`}
                          className={cn(
                            "relative h-full w-full border-t border-l",
                            isWithinDefinedWorkHours ? "bg-background/50 hover:bg-primary/10" : "bg-muted/20 hover:bg-muted/30", // Different background for off-hours
                            "border-gray-200/80 dark:border-gray-700/80"
                          )}
                          style={{
                            gridColumn: dayIndex + 2, // +2 because of time label column (column 1)
                            gridRow: blockIndex + 2, // +2 because of header row (row 1)
                            height: `${rowHeight}px`,
                            zIndex: 1,
                            // Always display, let CSS handle visibility/styling
                          }}
                        >
                          <div className="absolute top-1/2 w-full border-b border-dashed border-gray-200/50 dark:border-gray-700/50" />
                          {getMinutes(block.start) === 0 && (
                            <span className="absolute inset-0 flex items-center justify-center text-6xl font-bubbly text-muted-foreground/30 pointer-events-none" style={{ zIndex: 0 }}>
                              {format(block.start, 'h')}
                            </span>
                          )}
                          {!isBlockOccupied && !isDemo && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="absolute inset-0 cursor-pointer rounded-lg hover:bg-muted/50 transition-colors" />
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-1">
                                <TimeBlockActionMenu
                                  block={{ start: blockStartWithDate, end: blockEndWithDate }}
                                  onAddAppointment={(b) => handleOpenAppointmentForm(b, day)}
                                  onScheduleTask={(taskId, bStart) => handleScheduleTask(taskId, bStart, day)}
                                  unscheduledTasks={unscheduledDoTodayTasks}
                                  sections={sections}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}

                {appointmentsWithPositions.map((app) => {
                  const task = app.task_id ? allTasks.find(t => t.id === app.task_id) : undefined;
                  const appDay = parseISO(app.date);
                  const workHoursForAppDay = getWorkHoursForDay(appDay);
                  const isWorkDayEnabled = !!workHoursForAppDay;

                  const minHour = workHoursForAppDay ? getHours(parse(workHoursForAppDay.start_time, 'HH:mm:ss', appDay)) : 0;
                  const maxHour = workHoursForAppDay ? getHours(parse(workHoursForAppDay.end_time, 'HH:mm:ss', appDay)) : 24;

                  const appStartHour = getHours(parse(app.start_time, 'HH:mm:ss', appDay));
                  const appEndHour = getHours(parse(app.end_time, 'HH:mm:ss', appDay));

                  const isWithinWorkHoursRange = isWorkDayEnabled && 
                    appStartHour >= minHour && appEndHour <= maxHour;

                  return (
                    <DraggableAppointmentCard
                      key={app.id}
                      appointment={app}
                      task={task}
                      onEdit={handleAppointmentClick}
                      onUnschedule={handleUnscheduleTask}
                      overlapOffset={app.overlapOffset}
                      style={{
                        gridColumn: app.gridColumn + 1, // Adjust gridColumn by +1 for the new time label column
                        gridRow: `${app.gridRowStart} / ${app.gridRowEnd}`,
                        zIndex: 10 + app.overlapOffset,
                        opacity: isWithinWorkHoursRange ? 1 : 0.6, // Reduce opacity for appointments outside work hours
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="relative mt-6 lg:mt-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsTaskPanelCollapsed(!isTaskPanelCollapsed)}
                className={cn(
                  "absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-background hover:bg-muted rounded-full h-8 w-8 border hidden lg:flex",
                  isTaskPanelCollapsed && "lg:hidden"
                )}
                aria-label={isTaskPanelCollapsed ? "Show task panel" : "Hide task panel"}
              >
                {isTaskPanelCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
              </Button>
              <div className={cn(
                "lg:w-[300px] lg:flex-shrink-0",
                isTaskPanelCollapsed && "hidden"
              )}>
                <div className="lg:sticky lg:top-4 space-y-4 bg-muted rounded-lg p-4">
                  <h3 className="text-lg font-semibold">Unscheduled Tasks</h3>
                  <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto p-1">
                    {unscheduledDoTodayTasks.length > 0 ? (
                      unscheduledDoTodayTasks.map(task => (
                        <DraggableScheduleTaskItem key={task.id} task={task} sections={sections} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No tasks to schedule.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
      <AppointmentForm
        isOpen={isAppointmentFormOpen}
        onClose={() => {
          setIsAppointmentFormOpen(false);
          setEditingAppointment(null);
          setSelectedTimeSlotForNew(null);
          setParsedDataForForm(null);
          setPendingAppointmentData(null);
        }}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        initialData={editingAppointment}
        selectedDate={selectedDateForNew}
        selectedTimeSlot={selectedTimeSlotForNew}
        prefilledData={parsedDataForForm}
      />
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
            <DraggableScheduleTaskItem task={activeDragItem.task} sections={sections} />
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
      <AlertDialog open={isClearDayDialogOpen} onOpenChange={setIsClearDayDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to clear the day?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove all appointments for {dayToClear ? format(dayToClear, 'MMMM d, yyyy') : 'the selected day'}. This cannot be undone immediately, but you can undo it from the toast notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearDay}>Clear Day</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isExtendHoursDialogOpen} onOpenChange={setIsExtendHoursDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extend Work Hours?</AlertDialogTitle>
            <AlertDialogDescription>
              This appointment falls outside your current work hours for {format(selectedDateForNew, 'EEEE, MMM d')}. Would you like to extend your work hours to {newHoursToExtend ? `${format(setHours(selectedDateForNew, newHoursToExtend.min), 'h a')} - ${format(setHours(selectedDateForNew, newHoursToExtend.max), 'h a')}` : 'fit it'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsExtendHoursDialogOpen(false);
              setNewHoursToExtend(null);
              setPendingAppointmentData(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExtendHours}>Extend Hours</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
};

export default ScheduleGridContent;