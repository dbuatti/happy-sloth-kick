import React, { useState, useCallback, useRef } from 'react'; // Removed useEffect
import { useAuth } from '@/context/AuthContext';
import { useTasks, Task } from '@/hooks/useTasks'; // Removed NewTaskData
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskFilter from '@/components/TaskFilter';
import { Button } from '@/components/ui/button';
import { Archive as ArchiveIcon, Trash2 } from 'lucide-react'; // Removed Undo2, ListRestart
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Removed import { toast } from 'sonner';
import { showSuccess } from '@/utils/toast';
import BulkActionBar from '@/components/BulkActionBar';
import { useAppointments } from '@/hooks/useAppointments';

interface ArchivePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth(); // Removed isLoading: authLoading
  const userId = demoUserId || user?.id || null; // Explicitly convert undefined to null

  const [currentDate] = useState(new Date());
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('archived');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const {
    tasks,
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    markAllTasksInSectionCompleted,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    allCategories,
    expandedSections,
    expandedTasks,
    toggleTask,
    toggleSection,
    toggleAllSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({
    currentDate,
    userId,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    futureTasksDaysVisible: -1, // Show all tasks regardless of date for archive
  });

  const { appointments, loading: appointmentsLoading } = useAppointments({ startDate: currentDate, endDate: currentDate });
  const scheduledTasksMap = new Map(appointments.filter(app => app.task_id).map(app => [app.task_id!, app]));

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [showConfirmClearArchiveDialog, setShowConfirmClearArchiveDialog] = useState(false);
  const [isClearingArchive, setIsClearingArchive] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const taskListRef = useRef<any>(null);

  const handleOpenOverview = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  }, []);

  // Removed handleRestoreTask as it was declared but never read.

  const handleClearArchive = async () => {
    setIsClearingArchive(true);
    const archivedTaskIds = tasks.filter(t => t.status === 'archived').map(t => t.id);
    const success = await bulkDeleteTasks(archivedTaskIds);
    if (success) {
      showSuccess('Archive cleared successfully!');
    }
    setIsClearingArchive(false);
    setShowConfirmClearArchiveDialog(false);
  };

  // Removed handleToggleTaskSelection as it was declared but never read.

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBulkRestore = async () => {
    if (selectedTaskIds.size > 0) {
      await bulkUpdateTasks({ status: 'to-do' }, Array.from(selectedTaskIds));
      handleClearSelection();
      showSuccess(`${selectedTaskIds.size} tasks restored!`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size > 0) {
      const success = await bulkDeleteTasks(Array.from(selectedTaskIds));
      if (success) {
        handleClearSelection();
        showSuccess(`${selectedTaskIds.size} tasks permanently deleted!`);
      }
    }
  };

  // Removed authLoading from condition as it's no longer destructured.
  if (tasksLoading) {
    return <div className="flex justify-center items-center h-screen">Loading archive...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-gradient-to-br from-[hsl(var(--gradient-start-light))] to-[hsl(var(--gradient-end-light))] dark:from-[hsl(var(--gradient-start-dark))] dark:to-[hsl(var(--gradient-end-dark))] rounded-b-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <ArchiveIcon className="h-8 w-8 text-primary" /> Archived Tasks
          </h1>
          <Button
            variant="destructive"
            onClick={() => setShowConfirmClearArchiveDialog(true)}
            disabled={isClearingArchive || filteredTasks.length === 0 || isDemo}
            className="h-9 text-base"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear Archive
          </Button>
        </div>
        <TaskFilter
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
        />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
            <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Your archive is empty!</p>
            <p className="text-sm">No tasks have been archived yet. Keep up the great work!</p>
          </div>
        ) : (
          <TaskList
            ref={taskListRef}
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={tasksLoading || appointmentsLoading}
            handleAddTask={handleAddTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            bulkUpdateTasks={bulkUpdateTasks}
            bulkDeleteTasks={bulkDeleteTasks}
            markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
            sections={sections}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            updateTaskParentAndOrder={updateTaskParentAndOrder}
            reorderSections={reorderSections}
            allCategories={allCategories}
            onOpenOverview={handleOpenOverview}
            currentDate={currentDate}
            expandedSections={expandedSections}
            expandedTasks={expandedTasks}
            toggleTask={toggleTask}
            toggleSection={toggleSection}
            toggleAllSections={toggleAllSections}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
          />
        )}
      </main>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
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
          allTasks={processedTasks}
        />
      )}

      <AlertDialog open={showConfirmClearArchiveDialog} onOpenChange={setShowConfirmClearArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete ALL archived tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingArchive}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearArchive} disabled={isClearingArchive}>
              {isClearingArchive ? 'Clearing...' : 'Clear All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTaskIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTaskIds.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkRestore} // Use restore for archive
          onArchive={() => {}} // Archive not applicable in archive view
          onDelete={handleBulkDelete}
          onChangePriority={() => {}} // Priority change not applicable in archive view
        />
      )}
    </div>
  );
};

export default ArchivePage;