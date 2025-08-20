import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, isSameDay, parseISO, isToday } from 'date-fns'; // Removed unused imports
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, useTasks, UpdateTaskData, NewTaskSectionData, UpdateTaskSectionData, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks'; // Removed unused Category types
import TaskItem from '@/components/TaskItem';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useDoToday } from '@/hooks/useDoToday'; // Import useDoToday

interface TaskCalendarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TaskCalendar: React.FC<TaskCalendarProps> = ({ demoUserId }) => { // Removed isDemo as it's unused
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  // const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false); // Removed unused state
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const {
    tasks: allTasks, // All tasks (real and generated recurring)
    isLoading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTasks({ userId: demoUserId, currentDate: selectedDate || new Date() });

  const { doTodayOffIds, toggleDoToday } = useDoToday({ userId: demoUserId, currentDate: selectedDate || new Date() });

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => task.status !== 'archived');
  }, [allTasks]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd');
        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)?.push(task);
      }
    });
    // Sort tasks within each group by order
    groups.forEach(tasksInDay => {
      tasksInDay.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return groups;
  }, [filteredTasks]);

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(null); // Close overview
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const updatedTask = await updateTask(taskId, { status: newStatus });
    return updatedTask;
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      <main className="flex-grow">
        <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <CalendarIcon className="h-7 w-7" /> Task Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center lg:text-left">
                Tasks for {selectedDate ? (isToday(selectedDate) ? 'Today' : format(selectedDate, 'PPP')) : 'No Date Selected'}
              </h3>
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {selectedDate && groupedTasks.has(format(selectedDate, 'yyyy-MM-dd')) ? (
                    <ul className="space-y-2">
                      {groupedTasks.get(format(selectedDate, 'yyyy-MM-dd'))?.map(task => (
                        <li key={task.id}>
                          <TaskItem
                            task={task}
                            onStatusChange={handleTaskStatusChange}
                            onDelete={deleteTask}
                            onUpdate={updateTask}
                            onOpenOverview={handleOpenOverview}
                            sections={sections}
                            allCategories={allCategories}
                            doTodayOffIds={doTodayOffIds}
                            toggleDoToday={toggleDoToday}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No tasks scheduled for this date.</p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
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
          allTasks={allTasks} // Pass all tasks for subtask filtering
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
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          allTasks={allTasks} // Pass all tasks for subtask selection
        />
      )}
    </div>
  );
};

export default TaskCalendar;