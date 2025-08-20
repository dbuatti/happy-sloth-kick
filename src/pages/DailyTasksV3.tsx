import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Task, useTasks, NewTaskData, NewTaskSectionData, UpdateTaskSectionData, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks'; // Removed unused Category types
import DailyTasksHeader from '@/components/DailyTasksHeader';
import TaskList from '@/components/TaskList';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import AddTaskForm from '@/components/AddTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react'; // Removed Search
import { useDoToday } from '@/hooks/useDoToday'; // Import useDoToday
import { format, isSameDay, parseISO } from 'date-fns';

interface DailyTasksV3Props {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksV3: React.FC<DailyTasksV3Props> = ({ demoUserId }) => { // Removed isDemo as it's unused
  const [currentDate] = useState(new Date()); // Removed setCurrentDate as it's not directly used to change date here

  const {
    tasks: allTasks, // All tasks (real and generated recurring)
    isLoading: tasksLoading,
    createTask,
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
  } = useTasks({ userId: demoUserId, currentDate: currentDate });

  const { doTodayOffIds, toggleDoToday, toggleAllDoToday, dailyProgress, updateDailyProgress } = useDoToday({ userId: demoUserId, currentDate: currentDate });

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('to-do');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    let filtered = allTasks.filter(task => {
      const isDueToday = task.due_date && isSameDay(parseISO(task.due_date), currentDate);
      const isRecurringToday = task.recurring_type !== 'none' && task.recurring_type !== null; // Simplified check, actual recurrence logic is in useTasks

      // Only show tasks due today or recurring for today, unless they are explicitly moved off "Do Today"
      return (isDueToday || isRecurringToday) && !doTodayOffIds.includes(task.id);
    });

    // Apply search filter
    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Apply section filter
    if (sectionFilter) {
      if (sectionFilter === 'no-section') {
        filtered = filtered.filter(task => task.section_id === null);
      } else {
        filtered = filtered.filter(task => task.section_id === sectionFilter);
      }
    }

    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order
  }, [allTasks, currentDate, doTodayOffIds, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  const nextAvailableTask = useMemo(() => {
    return filteredTasks.length > 0 ? filteredTasks[0] : null;
  }, [filteredTasks]);

  const handleAddTask = useCallback(() => {
    setPrefilledTaskData({
      due_date: format(currentDate, 'yyyy-MM-dd'),
      status: 'to-do',
    });
    setIsAddTaskDialogOpen(true);
  }, [currentDate]);

  const handleNewTaskSubmit = async (data: NewTaskData) => {
    const result = await createTask(data);
    if (result) {
      setIsAddTaskDialogOpen(false);
      setPrefilledTaskData(null);
      return result;
    }
    return null;
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(null); // Close overview
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const updateTaskParentAndOrder = async (updates: { id: string; order: number | null; parent_task_id: string | null; section_id: string | null }[]) => {
    // This function would typically make a batch update to the database
    // For now, we'll simulate by updating tasks one by one
    for (const update of updates) {
      await updateTask(update.id, {
        order: update.order,
        parent_task_id: update.parent_task_id,
        section_id: update.section_id,
      });
    }
  };

  // Update daily progress whenever filteredTasks changes
  React.useEffect(() => {
    updateDailyProgress(filteredTasks);
  }, [filteredTasks, updateDailyProgress]);

  return (
    <div className="flex-1 flex flex-col p-4">
      <main className="flex-grow">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <DailyTasksHeader
            currentDate={currentDate}
            nextAvailableTask={nextAvailableTask}
            updateTask={updateTask}
            onOpenOverview={handleOpenOverview}
            onAddTask={handleAddTask}
            sections={sections}
            allCategories={allCategories}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            allTasks={allTasks}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            toggleAllDoToday={toggleAllDoToday}
            dailyProgress={dailyProgress}
          />

          <Card className="shadow-lg rounded-xl p-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold">My Tasks</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search tasks..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="flex-grow"
                  />
                  <Button onClick={handleAddTask} variant="outline" size="icon">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select onValueChange={(value: Task['status'] | 'all') => setStatusFilter(value)} value={statusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="to-do">To-Do</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={setCategoryFilter} value={categoryFilter || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {allCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={setPriorityFilter} value={priorityFilter || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={setSectionFilter} value={sectionFilter || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sections</SelectItem>
                      <SelectItem value="no-section">No Section</SelectItem>
                      {sections.map(section => (
                        <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {tasksLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {filteredTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No tasks found for today matching your filters.</p>
                  ) : (
                    <TaskList
                      tasks={filteredTasks}
                      updateTask={updateTask}
                      onDeleteTask={deleteTask}
                      onOpenOverview={handleOpenOverview}
                      sections={sections}
                      allCategories={allCategories}
                      createSection={createSection}
                      updateSection={updateSection}
                      deleteSection={deleteSection}
                      updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                      updateTaskParentAndOrder={updateTaskParentAndOrder}
                      currentDate={currentDate}
                      doTodayOffIds={doTodayOffIds}
                      toggleDoToday={toggleDoToday}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm
            onAddTask={handleNewTaskSubmit}
            onTaskAdded={() => setIsAddTaskDialogOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            initialData={prefilledTaskData as Task | null}
          />
        </DialogContent>
      </Dialog>

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

export default DailyTasksV3;