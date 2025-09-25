import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkHours, WorkHour } from '@/hooks/useWorkHours';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import { CalendarDays } from 'lucide-react';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { settings } = useSettings();

  const { workHours: allWorkHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId: demoUserId });
  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentDate, endDate: currentDate, userId: demoUserId });
  const {
    allTasks,
    filteredTasks: allDayTasks,
    allCategories,
    sections,
  } = useTasks({ currentDate, userId: demoUserId });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Time Block Schedule
          </CardTitle>
          <p className="text-muted-foreground">Visualize and manage your daily schedule.</p>
        </CardHeader>
        <ScheduleGridContent
          isDemo={isDemo}
          onOpenTaskOverview={() => {}} // Placeholder for task overview
          currentViewDate={currentDate}
          daysInGrid={[currentDate]}
          allWorkHours={allWorkHours as WorkHour[]}
          saveWorkHours={saveWorkHours}
          appointments={appointments}
          addAppointment={addAppointment}
          updateAppointment={(id, updates) => updateAppointment({ id, updates })}
          deleteAppointment={deleteAppointment}
          clearDayAppointments={clearDayAppointments}
          batchAddAppointments={batchAddAppointments}
          allTasks={allTasks}
          allDayTasks={allDayTasks}
          allCategories={allCategories}
          sections={sections}
          settings={settings}
          isLoading={workHoursLoading || appointmentsLoading}
        />
      </Card>
    </div>
  );
};

export default TimeBlockSchedule;