import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import DateNavigator from '@/components/DateNavigator';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, format, isBefore, isSameDay, parseISO, isValid, setHours, setMinutes } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ListTodo, CheckCircle2, Clock, Brain, Sparkles } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { cn } from '@/lib/utils';
import BulkActions from '@/components/BulkActions';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from '@/hooks/use-mobile';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Badge } from '@/components/ui/badge';
import TaskFilter from '@/components/TaskFilter';
import MoodBoosterButton from '@/components/MoodBoosterButton'; // Import MoodBoosterButton
import TodayProgressCard from '@/components/TodayProgressCard'; // Import the new component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Import Dialog components
import TaskForm from '@/components/TaskForm'; // Import TaskForm for the AI parser dialog


const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const DailyTasksV3: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Call useTasks first
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
  } = useTasks({ currentDate, setCurrentDate, viewMode: 'daily' });

  // Then call useDailyTaskCount
  const { dailyTaskCount } = useDailyTaskCount();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isAiParserOpen, setIsAiParserOpen] = useState(false); // State for AI Parser Dialog

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, -1)));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, 1)));
  };

  const handleGoToToday = () => {
    setCurrentDate(getUTCStartOfDay(new Date()));
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
      due_date: null,
      notes: null,
      remind_at: null,
      parent_task_id: null,
      link: null,
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
    '/': (e) => { e.preventDefault(); searchInputRef.current?.focus(); },
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

  // Sticky shadow cue on scroll logic
  const [stuck, setStuck] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setStuck(scrollRef.current.scrollTop > 0);
      }
    };

    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const isBulkActionsActive = selectedTaskIds.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <main className={cn("flex-grow p-4", isBulkActionsActive ? "pb-[90px]" : "")}>
        <div className="w-full max-w-4xl mx-auto h-full">
          <Card className="shadow-lg p-4 h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {/* Date Navigator moved to top */}
                <DateNavigator
                  currentDate={currentDate}
                  onPreviousDay={handlePreviousDay}
                  onNextDay={handleNextDay}
                  onGoToToday={handleGoToToday}
                  setCurrentDate={setCurrentDate}
                />
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{dailyTaskCount}</span>
                  <MoodBoosterButton /> {/* This is the 'star' icon in your image */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFocusPanelOpen(true)}
                    aria-label="Open focus tools"
                    className="h-9 w-9"
                  >
                    <Brain className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-2">
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary">
                  <ListTodo className="h-3.5 w-3.5 mr-1.5" /> {totalCount} Total
                </Badge>
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> {completedCount} Completed
                </Badge>
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-destructive/10 text-destructive">
                  <Clock className="h-3.5 w-3.5 mr-1.5" /> {overdueCount} Overdue
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-3 flex-1 flex flex-col">
              {/* Today's Progress Card */}
              <div className="mb-4">
                <TodayProgressCard
                  totalTasks={totalCount}
                  completedTasks={completedCount}
                  overdueTasks={overdueCount}
                />
              </div>

              {/* Task Filter and Search */}
              <TaskFilter
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
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
                sections={sections}
                allCategories={allCategories}
                searchRef={searchInputRef}
              />

              {/* Quick Add Task Bar */}
              <div
                className={cn(
                  "quick-add-bar", // Apply the new base class
                  stuck ? "stuck" : "" // Apply stuck class conditionally
                )}
              >
                <form onSubmit={handleQuickAddTask}>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={quickAddInputRef}
                      placeholder='Quick add a task — press "/" to focus, Enter to add'
                      value={quickAddTaskDescription}
                      onChange={(e) => setQuickAddTaskDescription(e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button type="submit" className="whitespace-nowrap h-9 text-sm">
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsAiParserOpen(true)}
                      aria-label="Open AI Task Parser"
                      className="h-9 w-9"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto pt-3 -mx-4 px-4">
                <TaskList
                  tasks={tasks}
                  filteredTasks={filteredTasks}
                  loading={tasksLoading}
                  userId={userId}
                  handleAddTask={handleAddTask}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
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
                  onOpenOverview={handleOpenOverview}
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                />
              </div>
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
          onClose={() => {
            setIsTaskOverviewOpen(false);
            setTaskToOverview(null);
          }}
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

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={tasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenDetail}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        userId={userId}
        currentDate={currentDate}
      />

      {/* AI Task Parser Dialog */}
      <Dialog open={isAiParserOpen} onOpenChange={setIsAiParserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Task Parser
            </DialogTitle>
            <DialogDescription>
              Enter a task description and let AI suggest details like category, priority, and due date.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSave={async (taskData) => {
              const success = await handleAddTask(taskData);
              if (success) setIsAiParserOpen(false);
              return success;
            }}
            onCancel={() => setIsAiParserOpen(false)}
            userId={userId}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            autoFocus
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyTasksV3;