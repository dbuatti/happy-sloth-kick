import React, { useMemo } from 'react';
import { CardContent } from "@/components/ui/card";
import { useWorkHours, WorkHour } from '@/hooks/useWorkHours';
import { format, addMinutes, parse, getMinutes, getHours, setHours, setMinutes } from 'date-fns';
import DateNavigator from '@/components/DateNavigator';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import ScheduleGridContent from './ScheduleGridContent'; // Import the new component

interface DailyScheduleViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskDetail: (task: Task) => void;
  onOpenTaskOverview: (task: Task) => void;
}

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  currentDate,
  setCurrentDate,
  isDemo = false,
  demoUserId,
  onOpenTaskDetail,
  onOpenTaskOverview,
}) => {
  const { workHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ date: currentDate, userId: demoUserId });
  const singleDayWorkHours = workHours as WorkHour | null;

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentDate, endDate: currentDate });
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

  const timeBlocks = useMemo(() => {
    const blocks = [];
    const minHour = singleDayWorkHours?.enabled ? getHours(parse(singleDayWorkHours.start_time, 'HH:mm:ss', currentDate)) : 0;
    const maxHour = singleDayWorkHours?.enabled ? getHours(parse(singleDayWorkHours.end_time, 'HH:mm:ss', currentDate)) : 24;

    let currentTime = setHours(setMinutes(currentDate, 0), minHour);
    const endTime = setHours(setMinutes(currentDate, 0), maxHour);

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
  }, [currentDate, singleDayWorkHours]);

  const daysInGrid = useMemo(() => [currentDate], [currentDate]);

  const allWorkHoursArray = useMemo(() => {
    return singleDayWorkHours ? [singleDayWorkHours] : [];
  }, [singleDayWorkHours]);

  return (
    <>
      <CardContent className="pt-0">
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
          onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
          onGoToToday={() => setCurrentDate(new Date())}
          setCurrentDate={setCurrentDate}
        />
        <ScheduleGridContent
          isDemo={isDemo}
          demoUserId={demoUserId}
          onOpenTaskDetail={onOpenTaskDetail}
          onOpenTaskOverview={onOpenTaskOverview}
          currentViewDate={currentDate}
          daysInGrid={daysInGrid}
          timeBlocks={timeBlocks}
          allWorkHours={allWorkHoursArray}
          saveWorkHours={saveWorkHours}
          appointments={appointments}
          addAppointment={addAppointment}
          updateAppointment={updateAppointment}
          deleteAppointment={deleteAppointment}
          clearDayAppointments={clearDayAppointments}
          batchAddAppointments={batchAddAppointments}
          allTasks={allTasks}
          allDayTasks={allDayTasks}
          allCategories={allCategories}
          sections={sections}
          updateTask={updateTask}
          deleteTaskFromHook={deleteTaskFromHook}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          settings={settings}
          isLoading={workHoursLoading || appointmentsLoading}
        />
      </CardContent>
    </>
  );
};

export default DailyScheduleView;