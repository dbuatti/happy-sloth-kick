import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive as ArchiveIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskItem from '@/components/TaskItem';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import { format, parseISO, isSameDay } from 'date-fns';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const {
    processedTasks, // Use processedTasks here
    filteredTasks: archivedTasks, 
    loading: archiveLoading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    setStatusFilter,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    toggleDoToday,
    doTodayOffIds,
  } = useTasks({ viewMode: 'archive', userId: demoUserId, currentDate: new Date() });

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

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    setStatusFilter('archived');
  }, [setStatusFilter]);

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']): Promise<string | null> => {
    return await updateTask(taskId, { status: newStatus });
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const groupedArchivedTasks = useMemo(() => {
    const groups: { [date: string]: Task[] } = {};
    archivedTasks.forEach((task: Task) => {
      const dateToUse = task.completed_at || task.updated_at;
      if (dateToUse) {
        const dateKey = format(parseISO(dateToUse), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(task);
      }
    });

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      return parseISO(dateB).getTime() - parseISO(dateA).getTime();
    });
  }, [archivedTasks]);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <ArchiveIcon className="h-7 w-7 text-primary" /> Archived Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {archiveLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : archivedTasks.length === 0 ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No archived tasks found.</p>
                <p className="text-sm">Completed tasks will appear here once you archive them from your daily view.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedArchivedTasks.map(([dateKey, tasksInGroup]) => (
                  <div key={dateKey}>
                    <h3 className="text-xl font-bold mb-3 text-foreground">
                      {isSameDay(parseISO(dateKey), new Date()) ? 'Today' : format(parseISO(dateKey), 'EEEE, MMM d')}
                    </h3>
                    <ul className="space-y-2">
                      {tasksInGroup.map((task) => (
                        <li key={task.id} className="relative rounded-xl p-2 transition-all duration-200 ease-in-out group hover:shadow-md">
                          <TaskItem
                            task={task}
                            allTasks={processedTasks} // Pass processedTasks
                            onStatusChange={handleTaskStatusChange}
                            onDelete={deleteTask}
                            onUpdate={updateTask}
                            sections={sections}
                            onOpenOverview={handleOpenOverview}
                            currentDate={new Date()}
                            onMoveUp={async () => {}}
                            onMoveDown={async () => {}}
                            setFocusTask={setFocusTask}
                            isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                            toggleDoToday={() => toggleDoToday(task)}
                            scheduledTasksMap={scheduledTasksMap}
                            isDemo={isDemo}
                            level={0}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => {
            setIsTaskOverviewOpen(false);
            setTaskToOverview(null);
          }}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={processedTasks} // Pass processedTasks
        />
      )}
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={processedTasks} // Pass processedTasks
        />
      )}
    </div>
  );
};

export default Archive;