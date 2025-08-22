import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useWorkHours } from '@/hooks/useWorkHours';
import { Task, Appointment, TaskSection, TaskCategory } from '@/types/task';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import AppointmentForm from '@/components/AppointmentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TimeBlock from '@/components/TimeBlock';
import { TimeBlockSchedulePageProps } from '@/types/props';
import { cn } from '@/lib/utils';

const TimeBlockSchedulePage: React.FC<TimeBlockSchedulePagePageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);

  const {
    tasks,
    sections,
    allCategories,
    handleAddTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks({ userId: userId, currentDate: currentWeekStart, viewMode: 'all' });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({ userId });

  const {
    allWorkHours,
    isLoading: workHoursLoading,
    error: workHoursError,
    saveWorkHours,
  } = useWorkHours({ userId });

  const isLoading = tasksLoading || appointmentsLoading || workHoursLoading;
  const error = tasksError || appointmentsError || workHoursError;

  const daysInWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const timeBlocks = useMemo(() => {
    const blocks = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        blocks.push({
          start: setMinutes(setHours(startOfDay(new Date()), hour), minute),
          end: setMinutes(setHours(startOfDay(new Date()), hour), minute + 30),
        });
      }
    }
    return blocks;
  }, []);

  const unscheduledTasks = useMemo(() => {
    const scheduledTaskIds = new Set(appointments.filter(app => app.task_id).map(app => app.task_id));
    return tasks.filter(task => task.status === 'to-do' && !scheduledTaskIds.has(task.id));
  }, [tasks, appointments]);

  const handleAddAppointment = async (data: Partial<Appointment>) => {
    await addAppointment(data);
    setIsAppointmentFormOpen(false);
    setEditingAppointment(null);
  };

  const handleUpdateAppointment = async (id: string, data: Partial<Appointment>) => {
    await updateAppointment(id, data);
    setIsAppointmentFormOpen(false);
    setEditingAppointment(null);
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointment(id);
    setIsAppointmentFormOpen(false);
    setEditingAppointment(null);
  };

  const handleScheduleTask = async (taskId: string, blockStart: Date) => {
    const taskToSchedule = tasks.find(t => t.id === taskId);
    if (taskToSchedule) {
      await addAppointment({
        title: taskToSchedule.description,
        description: taskToSchedule.notes,
        date: format(blockStart, 'yyyy-MM-dd'),
        start_time: format(blockStart, 'HH:mm:ss'),
        end_time: format(addDays(blockStart, 1), 'HH:mm:ss'), // Default 1 hour
        color: '#3b82f6', // Default blue
        task_id: taskToSchedule.id,
      });
    }
  };

  const handleOpenTaskOverview = (task: Task) => {
    setSelectedTask(task);
    setIsTaskOverviewOpen(true);
  };

  const handleOpenTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleOpenFocusView = (task: Task) => {
    setSelectedTask(task);
    setIsFocusViewOpen(true);
  };

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading schedule...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading schedule: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Time Block Schedule</h1>

      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
        </h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-8 gap-1 flex-grow overflow-auto">
        {/* Time Column Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-gray-200 dark:border-gray-700"></div>
        {/* Day Headers */}
        {daysInWeek.map(day => (
          <div
            key={format(day, 'yyyy-MM-dd')}
            className={cn(
              'sticky top-0 bg-background z-10 text-center font-medium py-2 border-b border-gray-200 dark:border-gray-700',
              isSameDay(day, new Date()) && 'text-blue-600'
            )}
          >
            {format(day, 'EEE d')}
          </div>
        ))}

        {/* Time Blocks */}
        {timeBlocks.map((block, blockIndex) => (
          <React.Fragment key={blockIndex}>
            <div className="sticky left-0 bg-background z-10 text-right text-xs text-gray-500 pr-2 h-16 flex items-start pt-1 border-b border-gray-200 dark:border-gray-700">
              {block.start.getMinutes() === 0 && format(block.start, 'h a')}
            </div>
            {daysInWeek.map(day => {
              const currentBlockStart = setHours(setMinutes(startOfDay(day), block.start.getMinutes()), block.start.getHours());
              const currentBlockEnd = setHours(setMinutes(startOfDay(day), block.end.getMinutes()), block.end.getHours());

              const blockAppointments = appointments.filter(app => {
                const appDate = parseISO(app.date);
                const appStart = parseISO(app.date + 'T' + app.start_time);
                const appEnd = parseISO(app.date + 'T' + app.end_time);
                return (
                  isSameDay(appDate, day) &&
                  ((appStart < currentBlockEnd && appEnd > currentBlockStart) ||
                   (isSameDay(appStart, currentBlockStart) && appStart.getHours() === currentBlockStart.getHours() && appStart.getMinutes() === currentBlockStart.getMinutes()))
                );
              });

              const blockTasks = tasks.filter(task => {
                if (!task.due_date) return false;
                const taskDueDate = parseISO(task.due_date);
                return isSameDay(taskDueDate, day);
              });

              return (
                <TimeBlock
                  key={format(day, 'yyyy-MM-dd') + format(block.start, 'HH:mm')}
                  block={{ start: currentBlockStart, end: currentBlockEnd }}
                  appointments={blockAppointments}
                  tasks={blockTasks}
                  sections={sections}
                  onAddAppointment={(b) => {
                    setEditingAppointment({
                      id: '', user_id: userId!, title: '', description: null,
                      date: format(b.start, 'yyyy-MM-dd'),
                      start_time: format(b.start, 'HH:mm:ss'),
                      end_time: format(b.end, 'HH:mm:ss'),
                      color: '#3b82f6', created_at: '', updated_at: '', task_id: null
                    });
                    setIsAppointmentFormOpen(true);
                  }}
                  onScheduleTask={handleScheduleTask}
                  onOpenAppointmentDetail={(app) => {
                    setEditingAppointment(app);
                    setIsAppointmentFormOpen(true);
                  }}
                  onOpenTaskDetail={handleOpenTaskDetail}
                  unscheduledTasks={unscheduledTasks}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {isAppointmentFormOpen && (
        <AppointmentForm
          appointment={editingAppointment}
          onSave={editingAppointment ? (data) => handleUpdateAppointment(editingAppointment.id, data) : handleAddAppointment}
          onCancel={() => { setIsAppointmentFormOpen(false); setEditingAppointment(null); }}
          onDelete={handleDeleteAppointment}
          tasks={tasks}
          sections={sections}
          categories={allCategories}
          currentDate={currentWeekStart}
        />
      )}

      <TaskOverviewDialog
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        task={selectedTask}
        onOpenDetail={handleOpenTaskDetail}
        onOpenFocusView={handleOpenFocusView}
        updateTask={updateTask}
        deleteTask={deleteTask}
        sections={sections}
        categories={allCategories}
        allTasks={tasks}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      <TaskDetailDialog
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
        task={selectedTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        categories={allCategories}
        allTasks={tasks}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      {isFocusViewOpen && selectedTask && (
        <FullScreenFocusView
          task={selectedTask}
          onClose={() => setIsFocusViewOpen(false)}
          onComplete={() => {
            updateTask(selectedTask.id, { status: 'completed' });
            setIsFocusViewOpen(false);
          }}
          onSkip={() => {
            updateTask(selectedTask.id, { status: 'skipped' });
            setIsFocusViewOpen(false);
          }}
          onOpenDetail={handleOpenTaskDetail}
          updateTask={updateTask}
          sections={sections}
          categories={allCategories}
          allTasks={tasks}
          onAddTask={handleAddTask}
          onReorderTasks={reorderTasks}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedulePage;