import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Archive as ArchiveIcon, Trash2 } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/context/AuthContext';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskFilter from '@/components/TaskFilter';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date()); // Current date for task processing context
  const [isConfirmClearArchiveOpen, setIsConfirmClearArchiveOpen] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('archived'); // Default to archived
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkDeleteTasks,
    markAllTasksInSectionCompleted,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, userId, viewMode: 'archive', searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
    setIsTaskOverviewOpen(false); // Close overview if opening detail
  }, []);

  const handleClearArchive = async () => {
    if (!userId) return;
    const archivedTaskIds = filteredTasks.filter(task => task.status === 'archived').map(task => task.id);
    if (archivedTaskIds.length > 0) {
      await bulkDeleteTasks(archivedTaskIds);
    }
    setIsConfirmClearArchiveOpen(false);
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 p-4 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Archive</h1>

      <TaskFilter
        currentDate={currentDate}
        setCurrentDate={() => {}} // Not needed for archive view
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

      <Card className="mt-6 shadow-lg rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archived Tasks
          </h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsConfirmClearArchiveOpen(true)}
            disabled={filteredTasks.filter(t => t.status === 'archived').length === 0 || isDemo}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear Archive
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <TaskList
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={loading}
            handleAddTask={handleAddTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            bulkUpdateTasks={() => Promise.resolve()} // Not used in archive list directly
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
            setIsAddTaskOpen={() => {}}
            onOpenOverview={handleOpenTaskOverview}
            currentDate={currentDate}
            expandedSections={{}}
            expandedTasks={{}}
            toggleTask={() => {}}
            toggleSection={() => {}}
            toggleAllSections={() => {}}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
          />
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmClearArchiveOpen} onOpenChange={setIsConfirmClearArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete ALL archived tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearArchive}>Clear Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskClick}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allTasks={processedTasks}
      />

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
        allTasks={processedTasks}
      />
    </div>
  );
};

export default Archive;