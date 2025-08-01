import React, { useMemo, useState, useRef, useEffect } from 'react';
import DateNavigator from '@/components/DateNavigator';
import NextTaskCard from '@/components/NextTaskCard';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, format, isBefore, isSameDay, parseISO } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ListTodo } from 'lucide-react';
import { showError } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { cn } from '@/lib/utils';
import BulkActions from '@/components/BulkActions'; // Import BulkActions
import SmartSuggestions from '@/components/SmartSuggestions'; // Import SmartSuggestions

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
    updateTaskParentAndOrder,
  } = useTasks({ currentDate, setCurrentDate, viewMode: 'daily' });

  const { dailyTaskCount } = useDailyTaskCount();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
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

  const handleOpenDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    handleOpenDetail(task);
  };

  const handleQuickAddTask = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
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
      due_date: format(currentDate, 'yyyy-MM-dd'),
    });
    if (success) {
      setQuickAddTaskDescription('');
      quickAddInputRef.current?.focus();
    }
  };

  // Keyboard shortcuts (+ "/" quick focus for quick-add)
  const shortcuts: ShortcutMap = {
    'arrowleft': () => handlePreviousDay(),
    'arrowright': () => handleNextDay(),
    't': () => handleGoToToday(),
    '/': (e) => {
      e.preventDefault();
      quickAddInputRef.current?.focus();
    },
    'cmd+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
  };
  useKeyboardShortcuts(shortcuts);

  const { totalCount, completedCount, overdueCount } = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const overdue = filteredTasks.filter(t => {
      if (!t.due_date) return false;
      const due = parseISO(t.due_date);
      const isOver = isBefore(due, currentDate) && !isSameDay(due, currentDate) && t.status !== 'completed';
      return isOver;
    }).length;
    return { totalCount: total, completedCount: completed, overdueCount: overdue };
  }, [filteredTasks, currentDate]);

  // Sticky shadow cue on scroll
  const stickyRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => setStuck(!e.isIntersecting),
      { root: null, threshold: 1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const anyFilterActive =
    searchFilter !== '' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    sectionFilter !== 'all';

  const handleResetFiltersInline = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSectionFilter('all');
  };

  const isBulkActionsActive = selectedTaskIds.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <main className={cn("flex-grow p-3", isBulkActionsActive ? "pb-[80px]" : "")}>
        <div className="w-full max-w-4xl mx-auto space-y-3">
          <Card className="shadow-lg p-3">
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-3xl font-bold">Your Tasks</CardTitle>
                {dailyTaskCount > 0 && (
                  <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                    <ListTodo className="h-4 w-4" />
                    <span>{dailyTaskCount} today</span>
                  </div>
                )}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-xs sm:text-sm">
                <div className="rounded-md border bg-muted/30 px-2 py-2 text-center">
                  <span className="text-muted-foreground block">Total</span>
                  <div className="font-semibold">{totalCount}</div>
                </div>
                <div className="rounded-md border bg-muted/30 px-2 py-2 text-center">
                  <span className="text-muted-foreground block">Completed</span>
                  <div className="font-semibold">{completedCount}</div>
                </div>
                <div className={cn("rounded-md px-2 py-2 text-center border", overdueCount > 0 ? "bg-destructive/10 border-destructive/30" : "bg-muted/30")}>
                  <span className="text-muted-foreground block">Overdue</span>
                  <div className={cn("font-semibold", overdueCount > 0 ? "text-status-overdue" : "")}>{overdueCount}</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="mb-2">
                <DateNavigator
                  currentDate={currentDate}
                  onPreviousDay={handlePreviousDay}
                  onNextDay={handleNextDay}
                  onGoToToday={handleGoToToday}
                  setCurrentDate={setCurrentDate}
                />
              </div>

              {/* Sticky filter + quick add bar */}
              <div
                className={cn(
                  "sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border -mx-3 px-3 py-2 transition-shadow",
                  stuck ? "shadow-sm" : ""
                )}
              >
                <div ref={stickyRef} className="h-0 w-full -mt-1" aria-hidden />
                <form onSubmit={handleQuickAddTask} className="mb-2">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={quickAddInputRef}
                      placeholder='Quick add a task — press "/" to focus, Enter to add'
                      value={quickAddTaskDescription}
                      onChange={(e) => setQuickAddTaskDescription(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" className="whitespace-nowrap">
                      <Plus className="mr-2 h-4 w-4" /> New Task
                    </Button>
                  </div>
                </form>

                {anyFilterActive && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetFiltersInline}
                      className="text-xs px-2 py-1 rounded-full border hover:bg-muted transition"
                      aria-label="Reset filters"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>

              <NextTaskCard
                task={nextAvailableTask}
                onMarkComplete={handleMarkTaskComplete}
                onEditTask={handleOpenOverview}
                onOpenDetail={handleOpenDetail}
                currentDate={currentDate}
                loading={tasksLoading}
              />

              <SmartSuggestions
                tasks={filteredTasks}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                bulkUpdateTasks={bulkUpdateTasks}
                clearSelectedTasks={clearSelectedTasks}
              />

              <TaskList
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
                updateTaskParentAndOrder={updateTaskParentAndOrder}
                reorderSections={reorderSections}
                moveTask={moveTask}
                allCategories={allCategories}
                setIsAddTaskOpen={() => {}}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                searchRef={quickAddInputRef}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4">
        <MadeWithDyad />
      </footer>

      <BulkActions
        selectedTaskIds={selectedTaskIds}
        onAction={async (action) => {
          if (action.startsWith('priority-')) {
            await bulkUpdateTasks({ priority: action.replace('priority-', '') as Task['priority'] });
          } else if (action === 'complete') {
            await bulkUpdateTasks({ status: 'completed' });
          } else if (action === 'archive') {
            await bulkUpdateTasks({ status: 'archived' });
          } else if (action === 'delete') {
            // For now, directly call delete (will add dialog later if requested)
            await Promise.all(selectedTaskIds.map(id => deleteTask(id)));
            clearSelectedTasks();
          }
        }}
        onClearSelection={clearSelectedTasks}
      />

      <CommandPalette
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          userId={userId}
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
          userId={userId}
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

export default DailyTasksV2;