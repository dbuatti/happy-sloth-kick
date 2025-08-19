import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { format, addMinutes, parse, isBefore, getMinutes, getHours, parseISO, isValid, setHours, setMinutes, isSameDay, isAfter, differenceInMinutes } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Sparkles, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

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
  timeBlocks: { start: Date; end: Date }[];
  
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
  timeBlocks,
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
    return workHour || null;
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

  const daysInGrid = useMemo(() => {
    const days = [];
    let currentDay = startOfWeek(currentViewDate, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    return days;
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

    const currentMinHour = workHoursForAppDay?.enabled ? getHours(parse(workHoursForAppDay.start_time, 'HH:mm:ss', appDate)) : 0;
    const currentMaxHour = workHoursForAppDay?.enabled ? getHours(parse(workHoursForAppDay.end_time, 'HH:mm:ss', appDate)) : 24;

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
      <div className="grid border rounded-lg min-w-max relative" style={{ // Added relative positioning here
        gridTemplateColumns: `minmax(60px, auto) repeat(${daysInGrid.length}, minmax(120px, 1fr))`, // Added first column for time labels
        gridTemplateRows: `80px repeat(${timeBlocks.length}, 50px)`, // Fixed header height
        rowGap: '4px',
      }}>
        {/* Top-left empty corner */}
        <div className="p-2 border-b border-r bg-muted/30 h-full" style={{ gridColumn: 1, gridRow: 1 }}></div>

        {/* Header Row: Days */}
        {daysInGrid.map((day, index) => (
          <div key={index} className="p-2 border-b text-center font-semibold text-sm flex flex-col items-center justify-center bg-muted/30 h-full">
            <span>{format(day, 'EEE')}</span>
            <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
          </div>
        ))}

        {/* Grid Cells for each day and time block */}
        {timeBlocks.map((block, blockIndex) => (
          <React.Fragment key={`time-row-${blockIndex}`}>
            {/* Time Label Column */}
            <div className="p-2 border-b border-r text-right text-xs font-medium text-muted-foreground flex items-center justify-end bg-muted/30" style={{ gridColumn: 1, gridRow: blockIndex + 2, height: '50px' }}>
              {getMinutes(block.start) === 0 && format(block.start, 'h a')}
            </div>

            {daysInGrid.map((day, dayIndex) => (
              <div
                key={`${format(day, 'yyyy-MM-dd')}-${format(block.start, 'HH:mm')}`}
                className="relative h-full w-full border-t border-l border-gray-200/80 dark:border-gray-700/80"
                style={{
                  gridColumn: dayIndex + 2, // +2 because of time label column (column 1)
                  gridRow: blockIndex + 2, // +2 because of header row (row 1)
                }}
              >
                <div className="absolute top-1/2 w-full border-b border-dashed border-gray-200/50 dark:border-gray-700/50" />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
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
    </DndContext>
  );
};

export default ScheduleGridContent;