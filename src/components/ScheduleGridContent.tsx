import React, { useState, useMemo, useCallback } from 'react';
import { format, addMinutes, parse, getMinutes, getHours, parseISO, isSameDay, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { WorkHour } from '@/hooks/useWorkHours';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { parseAppointmentText } from '@/integrations/supabase/api';
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast';

// New modular components
import ScheduleGridHeader from './ScheduleGridHeader';
import ScheduleTimeColumn from './ScheduleTimeColumn';
import ScheduleDayGridCells from './ScheduleDayGridCells';
import ScheduleAppointmentsLayer from './ScheduleAppointmentsLayer';
import UnscheduledTasksPanel from './UnscheduledTasksPanel';
import ScheduleModals from './ScheduleModals';
import ScheduleDndProvider from './ScheduleDndProvider';

// New custom hooks
import { useVisibleTimeBlocks } from './hooks/useVisibleTimeBlocks';
import { usePositionedAppointments } from './hooks/usePositionedAppointments';

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
  // --- State Management ---
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlotForNew, setSelectedTimeSlotForNew] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date>(currentViewDate);

  const [isParsingDialogOpen, setIsParsingDialogOpen] = useState(false);
  const [textToParse, setTextToParse] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDataForForm, setParsedDataForForm] = useState<Partial<NewAppointmentData> | null>(null);

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

  // --- Callbacks and Memoized Values ---
  const getWorkHoursForDay = useCallback((date: Date) => {
    const dayOfWeekString = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const workHour = allWorkHours.find(wh => wh.day_of_week === dayOfWeekString);
    return workHour && workHour.enabled ? workHour : null;
  }, [allWorkHours]);

  const { visibleTimeBlocks } = useVisibleTimeBlocks({
    daysInGrid,
    allWorkHours,
    currentViewDate,
    getWorkHoursForDay,
  });

  const { appointmentsWithPositions } = usePositionedAppointments({
    appointments,
    daysInGrid,
    visibleTimeBlocks,
  });

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

  // --- Handlers ---
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

  const handleDragStart = (event: any) => {
    // DndProvider handles setting activeDragItem
  };

  const handleDragEnd = (event: any) => {
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
    <ScheduleDndProvider
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      allTasks={allTasks}
      sections={sections}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => handleClearDayClick(currentViewDate)} disabled={appointments.length === 0 || isDemo}>
            <X className="mr-2 h-4 w-4" /> Clear Day
          </Button>
          <Button variant="secondary" onClick={() => setIsParsingDialogOpen(true)} disabled={isDemo}>
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
            <div className="grid border border-gray-200 dark:border-gray-700 rounded-lg min-w-full relative bg-background" style={{
              gridTemplateColumns: `minmax(100px, auto) repeat(${daysInGrid.length}, minmax(120px, 1fr))`,
              gridTemplateRows: `${headerHeight}px repeat(${visibleTimeBlocks.length}, ${rowHeight}px)`,
            }}>
              <ScheduleGridHeader daysInGrid={daysInGrid} headerHeight={headerHeight} />
              <ScheduleTimeColumn visibleTimeBlocks={visibleTimeBlocks} rowHeight={rowHeight} />
              <ScheduleDayGridCells
                daysInGrid={daysInGrid}
                visibleTimeBlocks={visibleTimeBlocks}
                rowHeight={rowHeight}
                getWorkHoursForDay={getWorkHoursForDay}
                handleOpenAppointmentForm={handleOpenAppointmentForm}
                handleScheduleTask={handleScheduleTask}
                unscheduledDoTodayTasks={unscheduledDoTodayTasks}
                sections={sections}
                isDemo={isDemo}
              />
              <ScheduleAppointmentsLayer
                appointmentsWithPositions={appointmentsWithPositions}
                allTasks={allTasks}
                onAppointmentClick={handleAppointmentClick}
                onUnscheduleTask={handleUnscheduleTask}
              />
            </div>
          </div>
          <UnscheduledTasksPanel
            unscheduledDoTodayTasks={unscheduledDoTodayTasks}
            sections={sections}
            isTaskPanelCollapsed={isTaskPanelCollapsed}
            setIsTaskPanelCollapsed={setIsTaskPanelCollapsed}
          />
        </div>
      )}

      <ScheduleModals
        isAppointmentFormOpen={isAppointmentFormOpen}
        setIsAppointmentFormOpen={setIsAppointmentFormOpen}
        editingAppointment={editingAppointment}
        setEditingAppointment={setEditingAppointment}
        selectedTimeSlotForNew={selectedTimeSlotForNew}
        setSelectedTimeSlotForNew={setSelectedTimeSlotForNew}
        selectedDateForNew={selectedDateForNew}
        setSelectedDateForNew={setSelectedDateForNew}
        handleSaveAppointment={handleSaveAppointment}
        handleDeleteAppointment={handleDeleteAppointment}
        parsedDataForForm={parsedDataForForm}
        setParsedDataForForm={setParsedDataForForm}
        setPendingAppointmentData={setPendingAppointmentData}

        isParsingDialogOpen={isParsingDialogOpen}
        setIsParsingDialogOpen={setIsParsingDialogOpen}
        textToParse={textToParse}
        setTextToParse={setTextToParse}
        isParsing={isParsing}
        handleParseText={handleParseText}

        isClearDayDialogOpen={isClearDayDialogOpen}
        setIsClearDayDialogOpen={setIsClearDayDialogOpen}
        dayToClear={dayToClear}
        setDayToClear={setDayToClear}
        handleClearDay={handleClearDay}

        isExtendHoursDialogOpen={isExtendHoursDialogOpen}
        setIsExtendHoursDialogOpen={setIsExtendHoursDialogOpen}
        newHoursToExtend={newHoursToExtend}
        setNewHoursToExtend={setNewHoursToExtend}
        confirmExtendHours={confirmExtendHours}
      />
    </ScheduleDndProvider>
  );
};

export default ScheduleGridContent;