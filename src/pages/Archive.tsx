import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive as ArchiveIcon, Trash2 } from 'lucide-react';
import { useTasks, Task, NewTaskData } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskFilter from '@/components/TaskFilter';
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
import { useSettings } from '@/context/SettingsContext';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings, updateSettings } = useSettings();

  const [currentDate] = useState(new Date()); // currentDate is not directly used for filtering in archive, but needed for useTasks hook
  const [showConfirmClearArchive, setShowConfirmClearArchive] = useState(false);

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask, // Not directly used in archive view, but required by TaskList
    updateTask,
    deleteTask,
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
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'archive', userId });

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

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleClearArchive = async () => {
    const archivedTaskIds = filteredTasks.map(task => task.id);
    await bulkDeleteTasks(archivedTaskIds);
    setShowConfirmClearArchive(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pt-12">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Archive</h2>
        <Button
          variant="destructive"
          onClick={() => setShowConfirmClearArchive(true)}
          disabled={filteredTasks.length === 0 || isDemo}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Clear Archive
        </Button>
      </div>

      <Card className="flex-1">
        <CardHeader className="pb-2">
          <TaskFilter
            currentDate={currentDate}
            setCurrentDate={() => {}} // Not relevant for archive, but required by prop
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
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
              <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Your archive is empty!</p>
              <p className="text-sm">Completed or archived tasks will appear here.</p>
            </div>
          ) : (
            <TaskList
              processedTasks={processedTasks}
              filteredTasks={filteredTasks}
              loading={loading}
              handleAddTask={handleAddTask}
              updateTask={updateTask}
              deleteTask={deleteTask}
              bulkUpdateTasks={() => Promise.resolve()} // Not used in archive view
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
              onOpenOverview={() => {}} // Not used in archive view
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
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmClearArchive} onOpenChange={setShowConfirmClearArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete ALL tasks in your archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearArchive} disabled={loading}>
              {loading ? 'Clearing...' : 'Clear All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;