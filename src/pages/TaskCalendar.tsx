import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskSection, TaskCategory, TaskStatus } from '@/types/task';
import { format, startOfWeek, addDays, isSameDay, isPast, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import AddTaskForm from '@/components/AddTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskCalendarPageProps } from '@/types/props';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/utils/categoryColors';

const TaskCalendarPage: React.FC<TaskCalendarPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
    isLoading,
    error,
  } = useTasks({ userId: userId, currentDate: currentMonth, viewMode: 'all' });

  const handleOpenOverview = (task: Task) => {
    setSelectedTask(task);
    setIsOverviewOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleOpenFocusView = (task: Task) => {
    setSelectedTask(task);
    setIsFocusViewOpen(true);
  };

  const handleNewTaskSubmit = async (taskData: Partial<Task>) => {
    const newTask = await handleAddTask(taskData);
    if (newTask) {
      setIsAddTaskDialogOpen(false);
      setPrefilledTaskData(null);
    }
    return newTask;
  };

  const daysInMonth = useMemo(() => {
    const startDay = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks to cover the month
      days.push(addDays(startDay, i));
    }
    return days;
  }, [currentMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)?.push(task);
      }
    });
    return map;
  }, [tasks]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => addDays(prev, -30)); // Approximation for previous month
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addDays(prev, 30)); // Approximation for next month
  };

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading tasks calendar...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading tasks: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Task Calendar</h1>

      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-grow">
        {daysInMonth.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay.get(dateKey) || [];
          const isCurrentMonth = format(day, 'MM') === format(currentMonth, 'MM');
          const isToday = isSameDay(day, new Date());
          const isPastDay = isPast(day) && !isToday;

          return (
            <Card
              key={index}
              className={cn(
                'relative h-32 flex flex-col p-1 text-xs overflow-hidden',
                !isCurrentMonth && 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                isToday && 'border-2 border-blue-500',
                isPastDay && 'opacity-70'
              )}
            >
              <CardHeader className="p-1 flex flex-row items-center justify-between">
                <CardTitle className={cn("text-sm font-bold", isToday && "text-blue-600")}>
                  {format(day, 'd')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    setPrefilledTaskData({ due_date: format(day, 'yyyy-MM-dd') });
                    setIsAddTaskDialogOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto p-0">
                {dayTasks.map(task => {
                  const category = allCategories.find(cat => cat.id === task.category);
                  const categoryColorProps = category ? getCategoryColorProps(category.color) : null;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center text-xs rounded-sm px-1 py-0.5 mb-0.5 cursor-pointer",
                        task.status === 'completed' ? 'line-through text-gray-500' : '',
                        categoryColorProps?.backgroundClass,
                        categoryColorProps?.text
                      )}
                      onClick={() => handleOpenOverview(task)}
                    >
                      {categoryColorProps && (
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mr-1',
                            categoryColorProps.dotColor
                          )}
                          style={{ backgroundColor: categoryColorProps.bg }}
                        />
                      )}
                      <span className="truncate">{task.description}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm
            onAddTask={handleNewTaskSubmit}
            onTaskAdded={() => setIsAddTaskDialogOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentMonth}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            initialData={prefilledTaskData}
          />
        </DialogContent>
      </Dialog>

      <TaskOverviewDialog
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        task={selectedTask}
        onOpenDetail={handleOpenDetail}
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
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
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
          onOpenDetail={handleOpenDetail}
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

export default TaskCalendarPage;