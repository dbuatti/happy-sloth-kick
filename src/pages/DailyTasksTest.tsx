import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Edit, Lightbulb, CalendarDays, Target, ListTodo, Sparkles, Clock, StickyNote, BellRing, FolderOpen, Repeat, Link as LinkIcon } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { format, isSameDay, parseISO, isPast } from 'date-fns';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import AddTaskForm from '@/components/AddTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';

const DailyTasksTest: React.FC = () => {
  const [currentDate] = useState(new Date()); // Fixed to today for this test page
  const { user } = useAuth();
  const {
    tasks, // All tasks for subtask filtering
    filteredTasks,
    loading,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
  } = useTasks({ currentDate, viewMode: 'daily' }); // Use daily view mode

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const todayTasks = useMemo(() => {
    return filteredTasks.filter(task => task.status !== 'completed' && task.status !== 'archived' && task.parent_task_id === null)
      .sort((a, b) => {
        // Sort by priority: urgent > high > medium > low
        const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by due date (earliest first, null last)
        if (a.due_date && b.due_date) {
          return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        // Finally by order
        return (a.order || 0) - (b.order || 0);
      });
  }, [filteredTasks]);

  const currentFocusTask = useMemo(() => {
    return todayTasks.find(task => task.status === 'to-do') || null;
  }, [todayTasks]);

  const upcomingTasks = useMemo(() => {
    return todayTasks.filter(task => task.id !== currentFocusTask?.id);
  }, [todayTasks, currentFocusTask]);

  const completedTasksToday = useMemo(() => {
    return filteredTasks.filter(task =>
      task.status === 'completed' &&
      isSameDay(parseISO(task.created_at), currentDate) &&
      task.parent_task_id === null
    );
  }, [filteredTasks, currentDate]);

  const handleMarkComplete = async (task: Task) => {
    await updateTask(task.id, { status: 'completed' });
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-priority-urgent';
      case 'high': return 'text-priority-high';
      case 'medium': return 'text-priority-medium';
      case 'low': return 'text-priority-low';
      default: return 'text-muted-foreground';
    }
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isSameDay(date, currentDate)) {
      return 'Today';
    } else if (isPast(date) && !isSameDay(date, currentDate)) {
      return `Overdue ${format(date, 'MMM d')}`;
    } else {
      return `Due ${format(date, 'MMM d')}`;
    }
  };

  const renderTaskDetails = (task: Task) => {
    const categoryColorProps = getCategoryColorProps(task.category_color);
    const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), currentDate);
    const isDueToday = task.due_date && task.status !== 'completed' && isSameDay(parseISO(task.due_date), currentDate);

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={cn("w-3 h-3 rounded-full flex items-center justify-center border", categoryColorProps.backgroundClass, categoryColorProps.dotBorder)}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColorProps.dotColor }}></div>
          </div>
          <span className={cn("font-semibold", getPriorityColor(task.priority))}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1",
              isOverdue && "text-status-overdue font-semibold",
              isDueToday && "text-status-due-today font-semibold"
            )}>
              <CalendarDays className="h-3 w-3" />
              {getDueDateDisplay(task.due_date)}
            </span>
          )}
          {task.remind_at && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 text-primary dark:text-primary">
                  <BellRing className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Reminder: {format(parseISO(task.remind_at), 'MMM d, HH:mm')}
              </TooltipContent>
            </Tooltip>
          )}
          {task.notes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <StickyNote className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Notes:</p>
                <p className="text-sm">{task.notes}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {task.link && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={task.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon className="h-3 w-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Link:</p>
                <p className="text-sm truncate">{task.link}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <Card className="w-full shadow-lg p-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <Sparkles className="h-7 w-7 text-primary" /> Daily Tasks Test
              </CardTitle>
              <p className="text-sm text-muted-foreground text-center">
                A new look for your daily productivity.
              </p>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              <div className="flex justify-center">
                <Button onClick={() => setIsAddTaskOpen(true)} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add New Task
                </Button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              ) : (
                <>
                  {/* Current Focus Task */}
                  <Card className="border-l-4 border-primary shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" /> Today's Focus
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {currentFocusTask ? (
                        <div className="space-y-3">
                          <h3 className="text-2xl font-bold text-foreground">{currentFocusTask.description}</h3>
                          {renderTaskDetails(currentFocusTask)}
                          <div className="flex gap-2 mt-4">
                            <Button onClick={() => handleMarkComplete(currentFocusTask)} className="flex-1">
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                            </Button>
                            <Button variant="outline" onClick={() => handleEditTask(currentFocusTask)} className="flex-1">
                              <Edit className="mr-2 h-4 w-4" /> Edit Task
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No tasks to focus on right now. Add a new task!</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Upcoming Tasks */}
                  {upcomingTasks.length > 0 && (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <ListTodo className="h-5 w-5 text-muted-foreground" /> Upcoming Tasks
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-3">
                          {upcomingTasks.map(task => (
                            <li key={task.id} className="flex items-center justify-between p-2 border rounded-md bg-background hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleEditTask(task)}>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{task.description}</p>
                                {renderTaskDetails(task)}
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-2 ml-4">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleMarkComplete(task); }}>
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}>
                                  <Edit className="h-5 w-5 text-muted-foreground" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Completed Tasks Today */}
                  {completedTasksToday.length > 0 && (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" /> Completed Today
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-3">
                          {completedTasksToday.map(task => (
                            <li key={task.id} className="flex items-center justify-between p-2 border rounded-md bg-green-50/20 dark:bg-green-900/20 opacity-80">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium line-through text-muted-foreground truncate">{task.description}</p>
                                {renderTaskDetails(task)}
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                                <Edit className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>

      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm
            onAddTask={handleAddTask}
            userId={user?.id || null}
            onTaskAdded={() => setIsAddTaskOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
          />
        </DialogContent>
      </Dialog>

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={user?.id || null}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
        />
      )}
    </div>
  );
};

export default DailyTasksTest;