import React, { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { Task, TaskSection, TaskCategory, TaskStatus, TaskPriority } from '@/types/task';
import TaskList from '@/components/TaskList';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TaskFilter from '@/components/TaskFilter';
import { ArchivePageProps } from '@/types/props';

const ArchivePage: React.FC<ArchivePageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);

  const {
    tasks,
    processedTasks,
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
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
  } = useTasks({ userId: userId, currentDate: new Date(), viewMode: 'archive' });

  const handleOpenOverview = (task: Task) => {
    setSelectedTask(task);
    setIsOverviewOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleDeleteAllArchived = async () => {
    const archivedTaskIds = tasks.filter(task => task.status === 'archived').map(task => task.id);
    if (archivedTaskIds.length > 0) {
      for (const taskId of archivedTaskIds) {
        await deleteTask(taskId);
      }
    }
    setIsConfirmDeleteAllOpen(false);
  };

  const filteredArchivedTasks = useMemo(() => {
    return tasks.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (sectionFilter !== 'all' && task.section_id !== sectionFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading archived tasks...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading archived tasks: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Archived Tasks</h1>

      <div className="flex justify-between items-center mb-4">
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
        <Button variant="destructive" onClick={() => setIsConfirmDeleteAllOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" /> Delete All Archived
        </Button>
      </div>

      <div className="space-y-4">
        {filteredArchivedTasks.length === 0 ? (
          <p className="text-center text-gray-500">No archived tasks found.</p>
        ) : (
          <TaskList
            tasks={filteredArchivedTasks}
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
            showDoTodayToggle={false}
            toggleDoToday={() => {}}
            doTodayOffIds={new Set()}
            isDemo={isDemo}
            nextAvailableTask={null}
            currentDate={new Date()}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            archiveAllCompletedTasks={() => {}}
            toggleAllDoToday={() => {}}
            setIsAddTaskDialogOpen={() => {}}
            setPrefilledTaskData={() => {}}
            dailyProgress={{ totalPendingCount: 0, completedCount: 0, overdueCount: 0 }}
            onOpenFocusView={() => {}}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            sectionFilter={sectionFilter}
            setSectionFilter={setSectionFilter}
          />
        )}
      </div>

      <TaskOverviewDialog
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        task={selectedTask}
        onOpenDetail={handleOpenDetail}
        onOpenFocusView={() => {}}
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

      <Dialog open={isConfirmDeleteAllOpen} onOpenChange={setIsConfirmDeleteAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete ALL archived tasks? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmDeleteAllOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllArchived}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArchivePage;