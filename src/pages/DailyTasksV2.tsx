import React, { useState, useRef, useEffect, useMemo } from 'react';
import DateNavigator from '@/components/DateNavigator';
import NextTaskCard from '@/components/NextTaskCard';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, startOfDay, format, isAfter, isSameDay, parseISO, isBefore } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, CalendarDays, Lightbulb, Clock, ListTodo, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { showSuccess, showError } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const DailyTasksV2: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { user } = useAuth();

  const {
    tasks,
    filteredTasks,
    nextAvailableTask,
    updateTask,
    deleteTask,
    userId,
    loading: tasksLoading,
    sections,
    allCategories,
    handleAddTask,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    moveTask,
    updateTaskParentAndOrder, // Destructure the new function
  } = useTasks({ currentDate, setCurrentDate, viewMode: 'daily' });

  const { dailyTaskCount, loading: dailyCountLoading } = useDailyTaskCount();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false); // For CommandPalette's open state
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, -1)));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, 1)));
  };

  const handleGoToToday = () => {
    setCurrentDate(getUTCStartOfDay(new Date()));
  };

  const handleMarkTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
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

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTaskDescription.trim()) {
      showError('Task description cannot be empty.');
      return;
    }
    const success = await handleAddTask({
      description: quickAddTaskDescription.trim(),
      category: allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || '',
      priority: 'medium',
      section_id: null,
      recurring_type: 'none',
      parent_task_id: null,
      due_date: format(currentDate, 'yyyy-MM-dd'), // Default to current date
    });
    if (success) {
      setQuickAddTaskDescription('');
      quickAddInputRef.current?.focus();
    }
  };

  // Keyboard shortcuts for DailyTasksPage
  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    't': handleGoToToday,
    'cmd+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
    'ctrl+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
    'cmd+n': (e) => { e.preventDefault(); quickAddInputRef.current?.focus(); },
    'ctrl+n': (e) => { e.preventDefault(); quickAddInputRef.current?.focus(); },
  };
  useKeyboardShortcuts(shortcuts);

  const upcomingTasks = useMemo(() => {
    const tomorrow = addDays(currentDate, 1);
    const nextWeek = addDays(currentDate, 7);

    return tasks.filter(task =>
      task.status === 'to-do' &&
      task.due_date &&
      isAfter(parseISO(task.due_date), currentDate) &&
      isBefore(parseISO(task.due_date), nextWeek)
    ).sort((a, b) => parseISO(a.due_date!).getTime() - parseISO(b.due_date!).getTime())
    .slice(0, 5); // Show top 5 upcoming tasks
  }, [tasks, currentDate]);

  const todayFocusTasks = useMemo(() => {
    return filteredTasks.filter(task =>
      task.status === 'to-do' &&
      (task.priority === 'urgent' || task.priority === 'high') &&
      (task.due_date ? isSameDay(parseISO(task.due_date), currentDate) : true)
    ).sort((a, b) => {
      // Sort by priority (urgent first), then by order
      const priorityOrder = { 'urgent': 1, 'high': 2, 'medium': 3, 'low': 4 };
      const priorityComparison = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityComparison !== 0) return priorityComparison;
      return (a.order || Infinity) - (b.order || Infinity);
    }).slice(0, 3); // Show top 3 focus tasks
  }, [filteredTasks, currentDate]);

  return (
    <>
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main Content Area */}
        <main className="flex-grow p-4 lg:w-2/3 xl:w-3/4">
          <Card className="w-full mx-auto shadow-lg p-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <CalendarDays className="h-7 w-7" /> Daily Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DateNavigator
                currentDate={currentDate}
                onPreviousDay={handlePreviousDay}
                onNextDay={handleNextDay}
                onGoToToday={handleGoToToday}
                setCurrentDate={setCurrentDate}
              />

              {/* Quick Add Task */}
              <form onSubmit={handleQuickAddTask} className="mb-4 flex gap-2">
                <Input
                  ref={quickAddInputRef}
                  placeholder="Quick add a new task (e.g., 'Call John about project urgent')"
                  value={quickAddTaskDescription}
                  onChange={(e) => setQuickAddTaskDescription(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!quickAddTaskDescription.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              <TaskList
                setIsAddTaskOpen={setIsCommandPaletteOpen} // Pass CommandPalette's open state setter
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                searchRef={quickAddInputRef}
                tasks={tasks}
                filteredTasks={filteredTasks}
                loading={tasksLoading}
                userId={userId}
                handleAddTask={handleAddTask}
                updateTask={updateTask}
                deleteTask={deleteTask}
                searchFilter={searchFilter}
                setSearchFilter={setSearchFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
                selectedTaskIds={selectedTaskIds}
                toggleTaskSelection={toggleTaskSelection}
                clearSelectedTasks={clearSelectedTasks}
                bulkUpdateTasks={bulkUpdateTasks}
                markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                sections={sections}
                createSection={createSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                reorderSections={reorderSections}
                moveTask={moveTask}
                updateTaskParentAndOrder={updateTaskParentAndOrder} {/* Pass the new function here */}
                allCategories={allCategories}
              />
            </CardContent>
          </Card>
        </main>

        {/* Right Sidebar/Panel */}
        <aside className="p-4 lg:w-1/3 xl:w-1/4 lg:border-l border-border space-y-6">
          {/* Daily Summary */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Daily Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tasks for Today:</span>
                <span className="font-bold text-xl">{dailyCountLoading ? <span className="animate-pulse">...</span> : dailyTaskCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next Task:</span>
                <span className="font-semibold text-right truncate max-w-[60%]">
                  {nextAvailableTask ? nextAvailableTask.description : 'None!'}
                </span>
              </div>
              <Button variant="outline" className="w-full" onClick={() => handleOpenOverview(nextAvailableTask!)} disabled={!nextAvailableTask}>
                View Next Task
              </Button>
            </CardContent>
          </Card>

          {/* Today's Focus */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Today's Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {todayFocusTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No high-priority tasks for today. Great job!</p>
              ) : (
                <ul className="space-y-2">
                  {todayFocusTasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{task.description}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenOverview(task)}>View</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming tasks in the next 7 days.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingTasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{task.description}</span>
                      <span className="text-muted-foreground text-xs ml-2">{task.due_date ? format(parseISO(task.due_date), 'MMM d') : ''}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenOverview(task)}>View</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Mini Calendar */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDate(getUTCStartOfDay(date));
                  }
                }}
                className="rounded-md border shadow-sm"
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      <footer className="p-4">
        <MadeWithDyad />
      </footer>

      {/* Dialogs for Task Management */}
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          userId={user?.id || null}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
        />
      )}
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
      <CommandPalette
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />
    </>
  );
};

export default DailyTasksV2;