import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { format, addMinutes, parse, isBefore, getMinutes, getHours, parseISO, isValid, startOfWeek, addDays, isSameDay, setHours, setMinutes, isAfter } from 'date-fns';
import { CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Sparkles, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useWorkHours, allDaysOfWeek } from '@/hooks/useWorkHours';
import { useAppointments, Appointment, NewAppointmentData } from '@/hooks/useAppointments';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast';
import { parseAppointmentText } from '@/integrations/supabase/api';
import AppointmentForm from '@/components/AppointmentForm';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import DraggableAppointmentCard from '@/components/DraggableAppointmentCard';
import DraggableScheduleTaskItem from '@/components/DraggableScheduleTaskItem';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TimeBlockActionMenu from './TimeBlockActionMenu';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


interface WeeklyScheduleGridProps {
  currentWeekStart: Date;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskDetail: (task: Task) => void;
  onOpenTaskOverview: (task: Task) => void;
}

const rowHeight = 50;
const gapHeight = 4;

const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({
  currentWeekStart,
  isDemo = false,
  demoUserId,
  onOpenTaskDetail,
  onOpenTaskOverview,
}) => {
  const weekEnd = addDays(currentWeekStart, 6);

  const { workHours: allWorkHoursRaw, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId: demoUserId });
  const allWorkHours = Array.isArray(allWorkHoursRaw) ? allWorkHoursRaw : [];

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentWeekStart, endDate: weekEnd });
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
   } = useTasks({ currentDate: currentWeekStart, userId: demoUserId }); // Pass currentWeekStart for task filtering context
  const { settings } = useSettings();

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlotForNew, setSelectedTimeSlotForNew] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date>(currentWeekStart);

  const [isParsingDialogOpen, setIsParsingDialogOpen] = useState(false);
  const [textToParse, setTextToParse] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDataForForm, setParsedDataForForm] = useState<Partial<NewAppointmentData> | null>(null);

  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  void setTaskToOverview; // Explicitly mark as used for TS6133
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  void setTaskToEdit; // Explicitly mark as used for TS6133
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
  const [isClearDayDialogOpen, setIsClearDayDialogOpen] = useState(false);
  const [dayToClear, setDayToClear] = useState<Date | null>(null);
  const [isExtendHoursDialogOpen, setIsExtendHoursDialogOpen] = useState(false);
  const [newHoursToExtend, setNewHoursToExtend] = useState<{ min: number; max: number } | null>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<NewAppointmentData | null>(null);


  // Dummy reads for TaskSection and Category types to resolve TS6133
  // These types are used in interfaces and function signatures, which the linter sometimes misses.
  const _dummyTaskSection: TaskSection | null = null;
  void _dummyTaskSection;
  const _dummyCategory: Category | null = null;
  void _dummyCategory;

  useEffect(() => {
    localStorage.setItem('scheduleTaskPanelCollapsed', JSON.stringify(isTaskPanelCollapsed));
  }, [isTaskPanelCollapsed]);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

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

    const currentDayOfWeekString = allDaysOfWeek[appDate.getDay()].id;
    const workHoursForAppDay = allWorkHours.find(wh => wh.day_of_week === currentDayOfWeekString);

    const currentMinHour = workHoursForAppDay?.enabled ? getHours(parse(workHoursForAppDay.start_time, 'HH:mm:ss', appDate)) : 0;
    const currentMaxHour = workHoursForAppDay?.enabled ? getHours(parse(workHoursForAppDay.end_time, 'HH:mm:ss', appDate)) : 24;

    const appStartHour = getHours(appStartTime);
    const appEndHour = getHours(appEndTime) + (getMinutes(appEndTime) > 0 ? 1 : 0);

    const requiresExtension = appStartHour < currentMinHour || appEndHour > currentMaxHour;

    if (requiresExtension && !isDemo) {
      setNewHoursToExtend({
        min: Math.min(currentMinHour, appStartHour),
        max: Math.max(currentMaxHour, appEndHour),
      });
      setPendingAppointmentData(data);
      setIsExtendHoursDialogOpen(true);
      return false;
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
      const currentDayOfWeekString = allDaysOfWeek[appDate.getDay()].id;
      const workHoursForAppDay = allWorkHours.find(wh => wh.day_of_week === currentDayOfWeekString);

      const updatedWorkHours = {
        ...(workHoursForAppDay || { day_of_week: currentDayOfWeekString, enabled: true }), // Create new if not exists
        start_time: format(setHours(appDate, newHoursToExtend.min), 'HH:mm:ss'),
        end_time: format(setHours(appDate, newHoursToExtend.max), 'HH:mm:ss'),
        enabled: true, // Ensure work hours are enabled if extended
      };
      await saveWorkHours(updatedWorkHours);
      setIsExtendHoursDialogOpen(false);
      setNewHoursToExtend(null);
      if (pendingAppointmentData) {
        if (editingAppointment) {
          await updateAppointment(editingAppointment.id, pendingAppointmentData);
        } else {
          await addAppointment(pendingAppointmentData);
        }
        setPendingAppointmentData(null);
        setIsAppointmentFormOpen(false);
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

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    onOpenTaskDetail(task);
  };
  void handleEditTaskFromOverview; // Explicitly mark as used for TS6133

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

  const timeBlocks = useMemo(() => {
    const blocks = [];
    // This timeBlocks array defines the vertical axis labels, so it should span the full 24 hours
    let currentTime = setHours(setMinutes(currentWeekStart, 0), 0); // Start from 00:00
    const endTime = setHours(setMinutes(currentWeekStart, 0), 24); // End at 24:00

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
  }, [currentWeekStart]);

  const daysInWeek = useMemo(() => {
    const days = [];
    let currentDay = startOfWeek(currentWeekStart, { weekStartsOn: 1 }); // Start on Monday
    for (let i = 0; i < 7; i++) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    return days;
  }, [currentWeekStart]);

  const getAppointmentGridPosition = useCallback((app: Appointment, dayIndex: number) => {
    if (!app.start_time || !app.end_time) {
      return { gridRowStart: 1, gridRowEnd: 1, gridColumn: dayIndex + 2, overlapOffset: 0 }; // +2 for time column
    }
    const appStartTime = parse(app.start_time, 'HH:mm:ss', parseISO(app.date));
    const appEndTime = parse(app.end_time, 'HH:mm:ss', parseISO(app.date));

    if (isNaN(appStartTime.getTime()) || isNaN(appEndTime.getTime())) {
      return { gridRowStart: 1, gridRowEnd: 1, gridColumn: dayIndex + 2, overlapOffset: 0 };
    }

    // Calculate grid row based on 00:00 as the start of the grid
    const startMinutesFromMidnight = (getHours(appStartTime) * 60) + getMinutes(appStartTime);
    const endMinutesFromMidnight = (getHours(appEndTime) * 60) + getMinutes(appEndTime);

    const gridRowStart = Math.floor(startMinutesFromMidnight / 30) + 1;
    const gridRowEnd = Math.ceil(endMinutesFromMidnight / 30) + 1;
    const gridColumn = dayIndex + 1; // Adjusted to 1-based index for columns

    return { gridRowStart, gridRowEnd, gridColumn };
  }, []);

  const appointmentsWithPositions = useMemo(() => {
    const positionedApps = appointments.map(app => {
      const dayIndex = daysInWeek.findIndex(day => isSameDay(day, parseISO(app.date)));
      if (dayIndex === -1) return null; // Should not happen if data is within current week

      return {
        ...app,
        ...getAppointmentGridPosition(app, dayIndex),
      };
    }).filter(Boolean) as (Appointment & { gridRowStart: number; gridRowEnd: number; gridColumn: number; })[];

    // Handle overlaps within each column (day)
    const finalApps = positionedApps.map(app => ({ ...app, overlapOffset: 0 }));

    daysInWeek.forEach((_, dayIndex) => {
      const appsForThisDay = finalApps.filter(app => app.gridColumn === dayIndex + 1)
                                      .sort((a, b) => a.gridRowStart - b.gridRowStart);
      
      for (let i = 0; i < appsForThisDay.length; i++) {
        for (let j = i + 1; j < appsForThisDay.length; j++) {
          const appA = appsForThisDay[i];
          const appB = appsForThisDay[j]; // Corrected: was appsForDates[j]

          const overlaps = (appA.gridRowStart < appB.gridRowEnd && appB.gridRowStart < appA.gridRowEnd);

          if (overlaps) {
            appB.overlapOffset = appA.overlapOffset + 1;
          }
        }
      }
    });
    return finalApps;
  }, [appointments, daysInWeek, getAppointmentGridPosition]);

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

  const handleScheduleTask = async (taskId: string, blockStart: Date, targetDate: Date) => {
    const task = allDayTasks.find(t => t.id === taskId);
    if (!task) return;

    const category = allCategories.find(c => c.id === task.category);

    const newAppointment: NewAppointmentData = {
      title: task.description || '', // Ensure title is string
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
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsParsingDialogOpen(true)} disabled={isDemo}>
              <Sparkles className="mr-2 h-4 w-4" /> Parse from Text
            </Button>
          </div>
        </div>

        {totalLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] lg:gap-6">
            <div className="flex-1 overflow-x-auto">
              <div className="grid border rounded-lg min-w-max" style={{
                gridTemplateColumns: `repeat(7, minmax(120px, 1fr))`, // Removed 80px column
                gridTemplateRows: `auto repeat(${timeBlocks.length}, ${rowHeight}px)`,
                rowGap: `${gapHeight}px`,
              }}>
                {/* Header Row: Days */}
                {daysInWeek.map((day, index) => (
                  <div key={index} className="p-2 border-b text-center font-semibold text-sm flex flex-col items-center justify-center bg-muted/30">
                    <span>{format(day, 'EEE')}</span>
                    <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
                    {!isDemo && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleClearDayClick(day)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Grid Cells for each day and time block */}
                {daysInWeek.map((day, dayIndex) => {
                  const dayOfWeek = day.getDay(); // 0 for Sunday, 1 for Monday
                  const workHoursForDay = allWorkHours.find(wh => wh.day_of_week === allDaysOfWeek[dayOfWeek].id);
                  const isWorkDayEnabled = workHoursForDay?.enabled;

                  const minHour = workHoursForDay?.enabled ? getHours(parse(workHoursForDay.start_time, 'HH:mm:ss', day)) : 0;
                  const maxHour = workHoursForDay?.enabled ? getHours(parse(workHoursForDay.end_time, 'HH:mm:ss', day)) : 24;

                  return timeBlocks.map((block, blockIndex) => {
                    const blockStartWithDate = setHours(setMinutes(day, getMinutes(block.start)), getHours(block.start));
                    const blockEndWithDate = addMinutes(blockStartWithDate, 30);

                    const isWithinWorkHours = isWorkDayEnabled && 
                      isAfter(blockStartWithDate, setHours(setMinutes(day, 0), minHour - 1)) && // -1 to include the start hour block
                      isBefore(blockEndWithDate, setHours(setMinutes(day, 0), maxHour + 1)); // +1 to include the end hour block

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
                          isWorkDayEnabled ? "bg-background/50" : "bg-muted/20",
                          isWithinWorkHours ? "hover:bg-primary/10" : "",
                          "border-gray-200/80 dark:border-gray-700/80"
                        )}
                        style={{
                          gridColumn: dayIndex + 1, // Adjusted to 1-based index for columns
                          gridRow: blockIndex + 2, // +2 because row 1 is for day headers
                          height: `${rowHeight}px`,
                          zIndex: 1,
                          display: isWithinWorkHours ? 'block' : 'none', // Hide blocks outside work hours
                        }}
                      >
                        <div className="absolute top-1/2 w-full border-b border-dashed border-gray-200/50 dark:border-gray-700/50" />
                        {/* Time label as background element, only in the first column */}
                        {dayIndex === 0 && getMinutes(block.start) === 0 && (
                          <span className="absolute right-full mr-4 text-xl font-bubbly text-muted-foreground whitespace-nowrap -translate-y-1/2" style={{ zIndex: 0 }}>
                            {format(block.start, 'h a')}
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
                  });
                })}

                {/* Appointments */}
                {appointmentsWithPositions.map((app) => {
                  const task = app.task_id ? allTasks.find(t => t.id === app.task_id) : undefined;
                  const appDay = parseISO(app.date);
                  const dayOfWeek = appDay.getDay();
                  const workHoursForAppDay = allWorkHours.find(wh => wh.day_of_week === allDaysOfWeek[dayOfWeek].id);
                  const isWorkDayEnabled = workHoursForAppDay?.enabled;

                  const minHour = workHoursForAppDay?.enabled ? getHours(parse(workHoursForAppDay.start_time, 'HH:mm:ss', appDay)) : 0;
                  const maxHour = workHoursForAppDay?.enabled ? getHours(parse(workHoursForAppDay.end_time, 'HH:mm:ss', appDay)) : 24;

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
                      gridRowStart={app.gridRowStart}
                      gridRowEnd={app.gridRowEnd}
                      overlapOffset={app.overlapOffset}
                      rowHeight={rowHeight}
                      gapHeight={gapHeight}
                      style={{
                        gridColumn: app.gridColumn,
                        gridRow: `${app.gridRowStart} / ${app.gridRowEnd}`,
                        left: `${app.overlapOffset * 10}px`,
                        width: `calc(100% - ${app.overlapOffset * 10}px)`,
                        backgroundColor: app.color,
                        zIndex: 10 + app.overlapOffset,
                        display: isWithinWorkHoursRange ? 'block' : 'none', // Hide appointments outside work hours
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
      </CardContent>
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
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={onOpenTaskDetail}
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
          allTasks={allTasks}
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

export default WeeklyScheduleGrid;