import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskSection, DailyTaskCount, TaskStatus, TaskPriority } from '@/types/task';
import TaskList from '@/components/TaskList';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import AddTaskForm from '@/components/AddTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ManageSectionsDialog from '@/components/ManageSectionsDialog';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import TaskFilter from '@/components/TaskFilter';
import { TasksPageProps } from '@/types/props'; // Import TasksPageProps

const TasksPage: React.FC<TasksPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [currentDate] = useState(new Date());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const {
    tasks,
    processedTasks,
    activeTasks,
    nextAvailableTask,
    sections,
    allCategories,
    doTodayOffIds,
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
    toggleDoToday,
    toggleAllDoToday,
    archiveAllCompletedTasks,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    searchFilter,
    setSearchFilter,
  } = useTasks({ userId: userId, currentDate: currentDate, viewMode: 'all' });

  const dailyProgress: DailyTaskCount = useDailyTaskCount(currentDate, userId);

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

  const filteredTasks = useMemo(() => {
    return activeTasks.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (sectionFilter !== 'all' && task.section_id !== sectionFilter) return false;
      if (searchFilter && task.description && !task.description.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });
  }, [activeTasks, statusFilter, categoryFilter, priorityFilter, sectionFilter, searchFilter]);

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading tasks...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading tasks: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <DailyTasksHeader
        dailyProgress={dailyProgress}
        toggleAllDoToday={toggleAllDoToday}
        showTodayTasks={() => {}}
        currentDate={currentDate}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        onAddTask={handleAddTask}
        setPrefilledTaskData={setPrefilledTaskData}
        isDemo={isDemo}
      />

      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Search tasks..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setIsAddTaskDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <TaskFilter
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        sections={sections}
        categories={allCategories}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {sections.map((section: TaskSection) => {
          const sectionTasks = filteredTasks.filter((task: Task) => task.section_id === section.id);
          return (
            <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{section.name}</h2>
                <span className="text-gray-500">{sectionTasks.length} tasks</span>
              </div>
              <TaskList
                tasks={sectionTasks}
                processedTasks={processedTasks}
                sections={sections}
                categories={allCategories}
                onStatusChange={updateTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onOpenOverview={handleOpenOverview}
                onOpenDetail={handleOpenDetail}
                onAddTask={handleAddTask}
                onReorderTasks={reorderTasks}
                showDoTodayToggle={true}
                toggleDoToday={toggleDoToday}
                doTodayOffIds={doTodayOffIds}
                isDemo={isDemo}
                nextAvailableTask={nextAvailableTask}
                currentDate={currentDate}
                createSection={createSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                archiveAllCompletedTasks={archiveAllCompletedTasks}
                toggleAllDoToday={toggleAllDoToday}
                setIsAddTaskDialogOpen={setIsAddTaskDialogOpen}
                setPrefilledTaskData={setPrefilledTaskData}
                dailyProgress={dailyProgress}
                onOpenFocusView={handleOpenFocusView}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
              />
            </div>
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
            currentDate={currentDate}
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

export default TasksPage;