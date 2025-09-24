import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { CalendarDays, CalendarWeek, PanelRightClose, PanelRightOpen, ListTodo, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkHours, WorkHour } from '@/hooks/useWorkHours';
import DateNavigator from '@/components/DateNavigator';
import WeeklyDateNavigator from '@/components/WeeklyDateNavigator';
import { useAppointments, Appointment, NewAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { format, addDays, startOfWeek, parseISO, isValid, differenceInMinutes, getHours, getMinutes, setHours, setMinutes } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { parseAppointmentText } from '@/integrations/supabase/api';
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppointmentForm from '@/components/AppointmentForm';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import { useAuth } from '@/context/AuthContext';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday

  const { workHours: allWorkHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId: demoUserId });
  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: viewMode === 'day' ? currentDate : currentWeekStart, endDate: viewMode === 'day' ? currentDate : addDays(currentWeekStart, 6), userId: demoUserId });
  const {
    tasks: allTasks,
    filteredTasks: allDayTasks,
    allCategories,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId: demoUserId });
  const { settings } = useSettings({ userId: demoUserId });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const daysInGrid = React.useMemo(() => {
    if (viewMode === 'day') {
      return [currentDate];
    } else {
      return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }
  }, [viewMode, currentDate, currentWeekStart]);

  const allWorkHoursArray = React.useMemo(() => {
    if (Array.isArray(allWorkHours)) {
      return allWorkHours;
    } else if (allWorkHours) {
      return [allWorkHours];
    }
    return [];
  }, [allWorkHours]);

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" /> Time Block Schedule
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            onClick={() => setViewMode('day')}
            className="h-9"
          >
            <CalendarDays className="mr-2 h-4 w-4" /> Day
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            onClick={() => setViewMode('week')}
            className="h-9"
          >
            <CalendarWeek className="mr-2 h-4 w-4" /> Week
          </Button>
        </div>
      </div>

      {viewMode === 'day' ? (
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
          onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
          onGoToToday={() => setCurrentDate(new Date())}
          setCurrentDate={setCurrentDate}
        />
      ) : (
        <WeeklyDateNavigator
          currentWeekStart={currentWeekStart}
          onPreviousWeek={() => setCurrentWeekStart(prevWeekStart => addDays(prevWeekStart, -7))}
          onNextWeek={() => setCurrentWeekStart(prevWeekStart => addDays(prevWeekStart, 7))}
          onGoToCurrentWeek={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          setCurrentWeekStart={setCurrentWeekStart}
        />
      )}

      <Card className="mt-4 shadow-lg rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <ScheduleGridContent
            isDemo={isDemo}
            onOpenTaskOverview={handleOpenTaskOverview}
            currentViewDate={viewMode === 'day' ? currentDate : currentWeekStart}
            daysInGrid={daysInGrid}
            allWorkHours={allWorkHoursArray}
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
        </CardContent>
      </Card>

      <TaskDetailDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskFromOverview}
        onUpdate={updateTask}
        onDelete={deleteSection} // This should be deleteTask, not deleteSection
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={allTasks}
      />
    </main>
  );
};

export default TimeBlockSchedule;