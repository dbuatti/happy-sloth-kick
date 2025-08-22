import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { format, addMinutes, parse, isBefore, getMinutes, getHours, parseISO, isValid, setHours, setMinutes, isSameDay, differenceInMinutes } from 'date-fns';
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
const headerHeight = 80; // Fixed height for the header row

const ScheduleGridContent: React.FC<ScheduleGridContentProps> = ({
  isDemo = false,
  onOpenTaskOverview,
  currentViewDate,
  daysInGrid,
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
    return workHour && workHour.enabled ? workHour : null;
  }, [allWorkHours]);

  const { visibleTimeBlocks } = useMemo(() => {
    let min = 24;
    let max = 0;
    let hasAnyWorkHours = false;

    daysInGrid.forEach(day => {
        const wh = getWorkHoursForDay(day);
        if (wh) {
            hasAnyWorkHours = true;
            const startHour = getHours(parse(wh.start_time, 'HH:mm:ss', day));
            const endHour = getHours(parse(wh.end_time, 'HH:mm:ss', day));
            if (startHour < min) min = startHour;
            if (endHour > max) max = endHour;
        }
    });

    if (!hasAnyWorkHours) {
        min = 9;
        max = 17;
    }

    const blocks = [];
    let currentTime = setHours(setMinutes(currentViewDate, 0), min);
    const endTime = setHours(setMinutes(currentViewDate, 0), max);

    while (currentTime.getTime() < endTime.getTime()) {
        blocks.push({ start: currentTime, end: addMinutes(currentTime, 30) });
        currentTime = addMinutes(currentTime, 30);
    }
    
    return { visibleTimeBlocks: blocks };
  }, [daysInGrid, getWorkHoursForDay, currentViewDate]);

  const appointmentsWithPositions = useMemo(() => {
    const positionedApps: (Appointment & { gridColumn: number; gridRowStart: number; gridRowEnd: number; trackIndex: number; totalTracks: number; })[] = [];

    daysInGrid.forEach((day, dayIndex) => {
      const appsForThisDay = appointments.filter(app => isSameDay(parseISO(app.date), day));

      const sortedApps = [...appsForThisDay].sort((a, b) => {
        const aStart = parse(a.start_time, 'HH:mm:ss', day);
        const bStart = parse(b.start_time, 'HH:mm:ss', day);
        return aStart.getTime() - bStart.getTime();
      });

      const tracks: Appointment[][] = []; // Each track holds non-overlapping appointments

      sortedApps.forEach(app => {
        const appDate = parseISO(app.date);
        const appStartTime = parse(app.start_time, 'HH:mm:ss', appDate);
        const appEndTime = parse(app.end_time, 'HH:mm:ss', appDate);

        if (!isValid(appStartTime) || !isValid(appEndTime)) {
          return; // Skip invalid appointments
        }

        const startBlockIndex = visibleTimeBlocks.findIndex(block =>
            getHours(block.start) === getHours(appStartTime) && getMinutes(block.start) === getMinutes(appStartTime)
        );

        if (startBlockIndex === -1) {
            return; // Skip if outside visible time blocks
        }

        const gridRowStart = startBlockIndex + 2; // +1 for 1-based indexing, +1 for header row
        const durationInMinutes = differenceInMinutes(appEndTime, appStartTime);
        const durationInBlocks = durationInMinutes / 30;
        const gridRowEnd = gridRowStart + durationInBlocks;

        let assignedToTrack = false;
        for (let i = 0; i < tracks.length; i++) {
          const lastAppInTrack = tracks[i][tracks[i].length - 1];
          const lastAppEndTime = parse(lastAppInTrack.end_time, 'HH:mm:ss', appDate);

          // Check if current app overlaps with the last app in this track
          // An overlap occurs if the current app starts before the last app ends
          if (appStartTime.getTime() < lastAppEndTime.getTime()) {
            continue; // Overlaps, try next track
          } else {
            // No overlap, assign to this track
            tracks[i].push(app);
            positionedApps.push({
              ...app,
              gridColumn: dayIndex + 1,
              gridRowStart,
              gridRowEnd,
              trackIndex: i,
              totalTracks: 0, // Will be updated later
            });
            assignedToTrack = true;
            break;
          }
        }

        if (!assignedToTrack) {
          // No suitable track found, create a new one
          tracks.push([app]);
          positionedApps.push({
            ...app,
            gridColumn: dayIndex + 1,
            gridRowStart,
            gridRowEnd,
            trackIndex: tracks.length - 1,
            totalTracks: 0, // Will be updated later
          });
        }
      });

      // After all apps for the day are assigned to tracks, update totalTracks
      const maxTracksForDay = tracks.length;
      positionedApps.filter(app => isSameDay(parseISO(app.date), day)).forEach(app => {
        app.totalTracks = maxTracksForDay;
      });
    });
    return positionedApps;
  }, [appointments, daysInGrid, visibleTimeBlocks]);

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
              <div className="grid border rounded-lg min-w-max relative" style={{
                gridTemplateColumns: `minmax(100px, auto) repeat(${daysInGrid.length}, minmax(120px, 1fr))`, // Increased minmax for time labels
                gridTemplateRows: `${headerHeight}px repeat(${visibleTimeBlocks.length}, ${rowHeight}px)`,
                // Removed rowGap here, will manage spacing with padding/margins inside cells
              }}>
                {/* Top-left empty cell */}
                <div className="p-2 border-b border-r bg-muted/30 h-full" style={{ gridColumn: 1, gridRow: 1 }}></div>

                {/* Day Headers */}
                {daysInGrid.map((day, index) => (
                  <div key={index} className="p-2 border-b text-center font-semibold text-sm flex flex-col items-center justify-center bg-muted/30 h-full"
                    style={{ gridColumn: index + 2, gridRow: 1, borderRight: index < daysInGrid.length - 1 ? '1px solid hsl(var(--border))' : 'none' }} // Add right border to day headers
                  >
                    <span>{format(day, 'EEE')}</span>
                    <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
                  </div>
                ))}

                {/* Time Labels and Grid Cells */}
                {visibleTimeBlocks.map((block, blockIndex) => (
                  <React.Fragment key={`row-${blockIndex}`}>
                    {/* Time Label */}
                    <div className="p-2 border-b border-r text-right text-xs font-medium text-muted-foreground flex items-center justify-end bg-muted/30"
                      style={{ gridColumn: 1, gridRow: blockIndex + 2, height: `${rowHeight}px` }}
                    >
                      {getMinutes(block.start) === 0 && format(block.start, 'h a')}
                    </div>

                    {/* Day Columns / Time Blocks */}
                    {daysInGrid.map((day, dayIndex) => {
                      const workHoursForDay = getWorkHoursForDay(day);
                      const dayStartTime = workHoursForDay ? parse(workHoursForDay.start_time, 'HH:mm:ss', day) : null;
                      const dayEndTime = workHoursForDay ? parse(workHoursForDay.end_time, 'HH:mm:ss', day) : null;

                      const blockStartWithDate = setHours(setMinutes(day, getMinutes(block.start)), getHours(block.start));
                      const blockEndWithDate = addMinutes(blockStartWithDate, 30);

                      const isOutsideWorkHours = workHoursForDay && (!workHoursForDay.enabled || isBefore(blockStartWithDate, dayStartTime!) || !isBefore(blockStartWithDate, dayEndTime!));

                      return (
                        <div
                          key={`${format(day, 'yyyy-MM-dd')}-${format(block.start, 'HH:mm')}`}
                          className={cn(
                            "relative h-full w-full",
                            "border-b border-gray-200 dark:border-gray-700", // Solid horizontal line for each row
                            dayIndex < daysInGrid.length - 1 && "border-r", // Vertical line for each column
                            isOutsideWorkHours ? "bg-muted/20" : "bg-background" // Background for work/non-work hours
                          )}
                          style={{ gridColumn: dayIndex + 2, gridRow: blockIndex + 2, height: `${rowHeight}px`, zIndex: 1 }}
                        >
                          {/* Dashed line in the middle of each 30-min block */}
                          <div className="absolute top-1/2 w-full border-b border-dashed border-gray-200/50 dark:border-gray-700/50" />
                          
                          {!isOutsideWorkHours && !isDemo && (
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
                {/* Render appointments on top of the grid cells */}
                {appointmentsWithPositions.map((app) => {
                  const task = app.task_id ? allTasks.find(t => t.id === app.task_id) : undefined;
                  return (
                    <DraggableAppointmentCard
                      key={app.id}
                      appointment={app}
                      task={task}
                      onEdit={handleAppointmentClick}
                      onUnschedule={handleUnscheduleTask}
                      trackIndex={app.trackIndex}
                      totalTracks={app.totalTracks}
                      style={{
                        gridColumn: app.gridColumn,
                        gridRow: `${app.gridRowStart} / ${app.gridRowEnd}`,
                        zIndex: 10 + app.trackIndex,
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