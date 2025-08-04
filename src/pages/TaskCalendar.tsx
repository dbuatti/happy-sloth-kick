import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useTasks, Task } from '@/hooks/useTasks';
import { format, parseISO, startOfDay } from 'date-fns';
import { CalendarDays, ListTodo } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import TaskItem from '@/components/TaskItem';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';

const TaskCalendar: React.FC = () => {
  const {
    tasks: allTasks,
    filteredTasks,
    loading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    setFocusTask,
    toggleDoToday,
    doTodayOffIds,
  } = useTasks();

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    if (allAppointments) {
        allAppointments.forEach(app => {
            if (app.task_id) {
                map.set(app.task_id, app);
            }
        });
    }
    return map;
  }, [allAppointments]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);

  const tasksByDueDate = useMemo(() => {
    const groupedTasks = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      if (task.due_date && task.status !== 'archived') {
        const dateKey = format(startOfDay(parseISO(task.due_date)), 'yyyy-MM-dd');
        if (!groupedTasks.has(dateKey)) {
          groupedTasks.set(dateKey, []);
        }
        groupedTasks.get(dateKey)!.push(task);
      }
    });
    return groupedTasks;
  }, [filteredTasks]);

  const daysWithTasks = useMemo(() => {
    return Array.from(tasksByDueDate.keys()).map(dateStr => parseISO(dateStr));
  }, [tasksByDueDate]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(startOfDay(selectedDate), 'yyyy-MM-dd');
    return tasksByDueDate.get(dateKey) || [];
  }, [selectedDate, tasksByDueDate]);

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (_task: Task) => {
    setIsTaskOverviewOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <CalendarDays className="h-7 w-7 text-primary" /> Task Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                modifiers={{
                  hasTasks: daysWithTasks,
                }}
                modifiersClassNames={{
                  hasTasks: 'rdp-day_hasTasks',
                }}
                components={{
                  DayContent: ({ date }) => {
                    return <span>{format(date, 'd')}</span>;
                  },
                }}
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-primary" />
                Tasks for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : '...'}
              </h3>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : selectedDayTasks.length > 0 ? (
                <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {selectedDayTasks.map(task => (
                    <li key={task.id}>
                      <TaskItem
                        task={task}
                        onStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus })}
                        onDelete={deleteTask}
                        onUpdate={updateTask}
                        sections={sections}
                        onOpenOverview={handleOpenOverview}
                        currentDate={selectedDate || new Date()}
                        onMoveUp={async () => {}}
                        onMoveDown={async () => {}}
                        setFocusTask={setFocusTask}
                        isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                        toggleDoToday={toggleDoToday}
                        scheduledTasksMap={scheduledTasksMap}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground p-8 rounded-lg bg-muted/50">
                  <p>No tasks scheduled for this day.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={allTasks}
        />
      )}
    </div>
  );
};

export default TaskCalendar;