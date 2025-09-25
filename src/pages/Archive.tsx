import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import TaskFilter from '@/components/TaskFilter';
import { ChevronsDownUp, Archive as ArchiveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BulkActionBar from '@/components/BulkActionBar';
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

interface ArchivePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchivePageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings, updateSettings } = useSettings();

  const [currentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = new Set<string>(); // Removed useState, using a simple Set
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);

  const {
    processedTasks,
    filteredTasks,
    loading,
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
  } = useTasks({ currentDate, viewMode: 'archive', userId: userId });

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(false); // Close overview to open edit form
    setIsAddTaskOpen(true); // Re-use add task form for editing
  }, []);

  const handleAddTaskToSpecificSection = useCallback((sectionId: string | null) => {
    setTaskToOverview(null); // Clear any existing task data
    setIsAddTaskOpen(true);
  }, []);

  const handleToggleSelectTask = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(taskId)) {
        newSelection.delete(taskId);
      } else {
        newSelection.add(taskId);
      }
      return newSelection;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkComplete = useCallback(async () => {
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkArchive = useCallback(async () => {
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkDelete = useCallback(() => {
    setShowConfirmBulkDeleteDialog(true);
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    await bulkDeleteTasks(Array.from(selectedTasks));
    handleClearSelection();
    setShowConfirmBulkDeleteDialog(false);
  }, [bulkDeleteTasks, selectedTasks, handleClearSelection]);

  const handleBulkChangePriority = useCallback(async (priority: Task['priority']) => {
    await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleToggleAllSections = useCallback(() => {
    const allCollapsed = Object.values(expandedSections).every(val => val === false);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = allCollapsed;
    });
    newExpandedState['no-section-header'] = allCollapsed;
    updateSettings({ dashboard_layout: { ...settings?.dashboard_layout, expandedSections: newExpandedState } });
  }, [expandedSections, sections, settings?.dashboard_layout, updateSettings]);

  const taskListRef = useRef<any>(null);

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-7 w-7 text-primary" /> Archive
          </CardTitle>
          <p className="text-muted-foreground">Review and manage your archived tasks.</p>
        </CardHeader>
        <CardContent className="pt-0">
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
            searchRef={useRef<HTMLInputElement>(null)}
          />

          <div className="mt-4">
            <TaskList
              ref={taskListRef}
              processedTasks={processedTasks}
              filteredTasks={filteredTasks}
              loading={loading}
              handleAddTask={handleAddTask}
              updateTask={updateTask}
              deleteTask={deleteTask}
              bulkUpdateTasks={bulkUpdateTasks}
              markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
              sections={sections}
              allCategories={allCategories}
              updateTaskParentAndOrder={updateTaskParentAndOrder}
              reorderSections={reorderSections}
              setIsAddTaskOpen={setIsAddTaskOpen}
              onOpenOverview={handleOpenTaskOverview}
              currentDate={currentDate}
              expandedSections={expandedSections}
              expandedTasks={expandedTasks}
              toggleTask={toggleTask}
              toggleSection={toggleSection}
              toggleAllSections={handleToggleAllSections}
              setFocusTask={setFocusTask}
              doTodayOffIds={doTodayOffIds}
              toggleDoToday={toggleDoToday}
              scheduledTasksMap={new Map()} // No scheduled tasks in archive
              isDemo={isDemo}
            />
          </div>
        </CardContent>
      </Card>

      <FloatingAddTaskButton onClick={() => handleAddTaskToSpecificSection(null)} isDemo={isDemo} />

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
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
              This action cannot be undone. This will permanently delete {selectedTasks.size} selected tasks and all their sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;