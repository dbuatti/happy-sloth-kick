import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive as ArchiveIcon, ListRestart } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskFilter from '@/components/TaskFilter';
import TaskDetailDialog from '@/components/TaskDetailDialog';
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
import { Button } from '@/components/ui/button';
import BulkActionBar from '@/components/BulkActionBar';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date()); // Archive view doesn't depend on current date for filtering, but useTasks requires it.
  const {
    processedTasks,
    filteredTasks,
    loading,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    setSearchFilter,
    setStatusFilter,
    setCategoryFilter,
    setPriorityFilter,
    setSectionFilter,
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
  } = useTasks({ currentDate, viewMode: 'archive', userId: demoUserId });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, any>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<any>(null);
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === false ? true : false,
    }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === false ? true : false,
    }));
  }, []);

  const toggleAllSections = useCallback(() => {
    const allCollapsed = Object.values(expandedSections).every(val => val === false);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = allCollapsed;
    });
    newExpandedState['no-section-header'] = allCollapsed;
    setExpandedSections(newExpandedState);
  }, [expandedSections, sections]);

  const handleOpenOverview = useCallback((task: any) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: any) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true); // TaskDetailDialog is used for editing
  }, []);

  const handleSelectTask = (taskId: string, isSelected: boolean) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBulkComplete = async () => {
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTaskIds));
    handleClearSelection();
  };

  const handleBulkArchive = async () => {
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTaskIds));
    handleClearSelection();
  };

  const handleBulkChangePriority = async (priority: any) => {
    await bulkUpdateTasks({ priority }, Array.from(selectedTaskIds));
    handleClearSelection();
  };

  const handleBulkDeleteClick = () => {
    setShowConfirmBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    await bulkDeleteTasks(Array.from(selectedTaskIds));
    handleClearSelection();
    setShowConfirmBulkDeleteDialog(false);
  };

  const handleRestoreAllArchived = async () => {
    const archivedTaskIds = filteredTasks.filter(task => task.status === 'archived').map(task => task.id);
    if (archivedTaskIds.length > 0) {
      await bulkUpdateTasks({ status: 'to-do' }, archivedTaskIds);
    }
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <Card className="shadow-lg rounded-xl mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archive
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review and manage your archived tasks.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <Button variant="secondary" onClick={handleRestoreAllArchived} disabled={filteredTasks.length === 0 || isDemo}>
              <ListRestart className="mr-2 h-4 w-4" /> Restore All Archived
            </Button>
          </div>
          <TaskFilter
            currentDate={currentDate}
            setCurrentDate={() => {}} // Not relevant for archive, but required by prop
            searchFilter={''} // Pass empty string as search is not directly used in TaskFilter for archive
            setSearchFilter={setSearchFilter}
            statusFilter={'archived'} // Always show archived tasks
            setStatusFilter={setStatusFilter}
            categoryFilter={''}
            setCategoryFilter={setCategoryFilter}
            priorityFilter={''}
            setPriorityFilter={setPriorityFilter}
            sectionFilter={''}
            setSectionFilter={setSectionFilter}
            sections={sections}
            allCategories={allCategories}
            searchRef={null}
          />
          <TaskList
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={loading}
            handleAddTask={() => Promise.resolve()} // Not used in archive view
            updateTask={updateTask}
            deleteTask={deleteTask}
            bulkUpdateTasks={bulkUpdateTasks}
            bulkDeleteTasks={bulkDeleteTasks}
            markAllTasksInSectionCompleted={() => Promise.resolve()} // Not used in archive view
            sections={sections}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            updateTaskParentAndOrder={updateTaskParentAndOrder}
            reorderSections={reorderSections}
            allCategories={allCategories}
            setIsAddTaskOpen={() => {}} // Not used in archive view
            onOpenOverview={handleOpenOverview}
            currentDate={currentDate}
            expandedSections={expandedExpandedSections}
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
        </CardContent>
      </Card>

      {selectedTaskIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTaskIds.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDeleteClick}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      {taskToOverview && (
        <TaskDetailDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
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

      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedTaskIds.size} selected tasks and all their sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;