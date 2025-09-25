"use client";

import React, { useState, useMemo, useCallback } from 'react';
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyDateNavigator from '@/components/WeeklyDateNavigator';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks, Task } from '@/hooks/useTasks';
import { startOfWeek, addWeeks, addDays, isSameDay, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/context/AuthContext';
import ScheduleGridContent from '@/components/ScheduleGridContent';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday as start of week
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const { workHours: allWorkHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId: demoUserId });
  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentWeekStart, endDate: addDays(currentWeekStart, 6), userId: demoUserId });
  const {
    processedTasks,
    allCategories,
    sections,
    // Removed unused imports: handleAddTask, updateTask, deleteTask, createSection, updateSection, deleteSection, updateSectionIncludeInFocusMode
  } = useTasks({ currentDate, userId: demoUserId });

  const daysInWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const allWorkHoursArray = useMemo(() => {
    return Array.isArray(allWorkHours) ? allWorkHours : [];
  }, [allWorkHours]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    // This function is passed to ScheduleGridContent, which then passes it to TaskOverviewDialog.
    // The TaskOverviewDialog will handle opening the task details.
    // No direct state change needed here, as TaskOverviewDialog manages its own open state.
    console.log("Opening task overview for:", task.description);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'daily' | 'weekly')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="daily">Daily View</TabsTrigger>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <DailyScheduleView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                isDemo={isDemo}
                demoUserId={demoUserId}
                onOpenTaskOverview={handleOpenTaskOverview}
              />
            </TabsContent>

            <TabsContent value="weekly">
              <WeeklyDateNavigator
                currentWeekStart={currentWeekStart}
                onPreviousWeek={() => setCurrentWeekStart(prevDate => addWeeks(prevDate, -1))}
                onNextWeek={() => setCurrentWeekStart(prevDate => addWeeks(prevDate, 1))}
                onGoToCurrentWeek={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                setCurrentWeekStart={setCurrentWeekStart}
              />
              <ScheduleGridContent
                isDemo={isDemo}
                onOpenTaskOverview={handleOpenTaskOverview}
                currentViewDate={currentWeekStart}
                daysInGrid={daysInWeek}
                allWorkHours={allWorkHoursArray}
                saveWorkHours={saveWorkHours}
                appointments={appointments}
                updateAppointment={(id, updates) => updateAppointment({ id, updates })}
                addAppointment={addAppointment}
                deleteAppointment={deleteAppointment}
                clearDayAppointments={clearDayAppointments}
                batchAddAppointments={batchAddAppointments}
                allTasks={processedTasks}
                allDayTasks={processedTasks.filter(t => isSameDay(t.created_at ? parseISO(t.created_at) : new Date(), currentDate))} // Filter for current day tasks
                allCategories={allCategories}
                sections={sections}
                settings={{ schedule_show_focus_tasks_only: true }} // Placeholder for settings
                isLoading={workHoursLoading || appointmentsLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {/* Task Overview Dialog is managed internally by ScheduleGridContent */}
    </div>
  );
};

export default TimeBlockSchedule;