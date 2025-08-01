import React, { useState, useRef } from 'react';
import DateNavigator from '@/components/DateNavigator';
import NextTaskCard from '@/components/NextTaskCard';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, format } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from 'lucide-react';
import { showError } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';

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

  const { dailyTaskCount, loading: dailyCountLoading } = useDailyTaskCount();

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
      due_date: format(currentDate, 'yyyy-MM-dd'),
    });
    if (success) {
      setQuickAddTaskDescription('');
      quickAddInputRef.current?.focus();
    }
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': () => handlePreviousDay(),
    'arrowright': () => handleNextDay(),
    't': () => handleGoToToday(),
    'cmd+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold">Your Tasks</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-4">
                <DateNavigator
                  currentDate={currentDate}
                  onPreviousDay={handlePreviousDay}
                  onNextDay={handleNextDay}
                  onGoToToday={handleGoToToday}
                  setCurrentDate={setCurrentDate}
                />
              </div>

              <form onSubmit={handleQuickAddTask} className="flex items-center gap-2 mb-4">
                <Input
                  ref={quickAddInputRef}
                  placeholder="Quick add a task..."
                  value={quickAddTaskDescription}
                  onChange={(e) => setQuickAddTaskDescription(e.target.value)}
                />
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </form>

              <NextTaskCard
                task={nextAvailableTask}
                onMarkComplete={handleMarkTaskComplete}
                onEditTask={(task) => {
                  if (task) {
                    handleOpenOverview(task);
                  }
                }}
                currentDate={currentDate}
                loading={tasksLoading}
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