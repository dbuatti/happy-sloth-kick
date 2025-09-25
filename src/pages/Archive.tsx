import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive as ArchiveIcon, ListTodo } from 'lucide-react';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskFilter from '@/components/TaskFilter';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useSettings } from '@/context/SettingsContext';
import { useAllAppointments } from '@/hooks/useAllAppointments';
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
import { showSuccess, showError } from '@/utils/toast';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date());
  const { settings, updateSettings } = useSettings();

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
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
    sections,
    allCategories,
    updateTaskParentAndOrder,
    reorderSections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
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
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [showClearArchiveDialog, setShowClearArchiveDialog] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleClearArchive = async () => {
    try {
      const archivedTaskIds = filteredTasks.filter(task => task.status === 'archived').map(task => task.id);
      if (archivedTaskIds.length > 0) {
        await bulkDeleteTasks(archivedTaskIds);
        showSuccess('Archive cleared successfully!');
      } else {
        showError('No archived tasks to clear.');
      }
    } catch (error) {
      console.error('Error clearing archive:', error);
      showError('Failed to clear archive.');
    } finally {
      setShowClearArchiveDialog(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <Button
              variant="destructive"
              onClick={() => setShowClearArchiveDialog(true)}
              disabled={isDemo || filteredTasks.filter(task => task.status === 'archived').length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear Archive
            </Button>
          </div>
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
          <div className="mt-6">
            <TaskList
              processedTasks={processedTasks}
              filteredTasks={filteredTasks}
              loading={loading}
              handleAddTask={handleAddTask}
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
              expandedSections={settings?.expanded_sections || {}}
              expandedTasks={settings?.expanded_tasks || {}}
              toggleTask={(taskId) => updateSettings({ expanded_tasks: { ...settings?.expanded_tasks, [taskId]: !(settings?.expanded_tasks?.[taskId] ?? true) } })}
              toggleSection={(sectionId) => updateSettings({ expanded_sections: { ...settings?.expanded_sections, [sectionId]: !(settings?.expanded_sections?.[sectionId] ?? true) } })}
              toggleAllSections={() => {}} // Not used in archive view
              setFocusTask={setFocusTask}
              doTodayOffIds={doTodayOffIds}
              toggleDoToday={toggleDoToday}
              scheduledTasksMap={scheduledTasksMap}
              isDemo={isDemo}
            />
          </div>
        </CardContent>
      </Card>

      {isTaskOverviewOpen && taskToOverview && (
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

      <AlertDialog open={showClearArchiveDialog} onOpenChange={setShowClearArchiveDialog}>
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
    </div>
  );
};

export default Archive;