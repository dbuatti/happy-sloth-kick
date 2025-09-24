import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X, ListRestart, Archive as ArchiveIcon, Trash2, Undo2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton'; // Corrected import

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const [showConfirmDeleteAllDialog, setShowConfirmDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const {
    tasks, // rawTasks
    processedTasks, // tasks with category_color and virtual tasks
    filteredTasks,
    loading,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks, // Used here
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
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate: new Date(), viewMode: 'archive', userId: demoUserId });

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    handleOpenTaskOverview(task);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === false ? true : false,
    }));
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === false ? true : false,
    }));
  };

  const handleClearFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSectionFilter('all');
  };

  const isAnyFilterActive = searchFilter !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || sectionFilter !== 'all';

  const handleRestoreAllArchived = async () => {
    if (isDemo) return;
    const archivedTaskIds = filteredTasks.filter(t => t.status === 'archived').map(t => t.id);
    if (archivedTaskIds.length === 0) {
      showError('No archived tasks to restore.');
      return;
    }
    await bulkUpdateTasks({ status: 'to-do' }, archivedTaskIds);
    showSuccess('All archived tasks restored!');
  };

  const handleDeleteAllArchivedClick = () => {
    setShowConfirmDeleteAllDialog(true);
  };

  const confirmDeleteAllArchived = async () => {
    if (isDemo) return;
    setIsDeletingAll(true);
    const archivedTaskIds = filteredTasks.filter(t => t.status === 'archived').map(t => t.id);
    if (archivedTaskIds.length === 0) {
      showError('No archived tasks to delete.');
      setIsDeletingAll(false);
      setShowConfirmDeleteAllDialog(false);
      return;
    }
    await bulkDeleteTasks(archivedTaskIds);
    showSuccess('All archived tasks permanently deleted!');
    setIsDeletingAll(false);
    setShowConfirmDeleteAllDialog(false);
  };

  const scheduledTasksMap = useMemo(() => {
    return new Map<string, any>();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <ArchiveIcon className="inline-block h-10 w-10 mr-3 text-primary" /> Archive
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 px-4 py-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search archived tasks..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 h-9"
            />
            {searchFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchFilter('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 h-9">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="all">All</SelectItem>
                        {allCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="no-section">No Section</SelectItem>
                        {sections.map(section => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {isAnyFilterActive && (
              <Button variant="outline" onClick={handleClearFilters} className="gap-2 h-9">
                <ListRestart className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" onClick={handleRestoreAllArchived} disabled={isDemo || filteredTasks.length === 0}>
            <Undo2 className="mr-2 h-4 w-4" /> Restore All
          </Button>
          <Button variant="destructive" onClick={handleDeleteAllArchivedClick} disabled={isDemo || filteredTasks.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete All
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <ArchiveIcon className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">Your archive is empty!</p>
            <p className="text-sm">Completed or archived tasks will appear here.</p>
          </div>
        ) : (
          <TaskList
            tasks={processedTasks} // Use processedTasks
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={loading}
            handleAddTask={async () => {}} // Not used in archive
            updateTask={updateTask}
            deleteTask={deleteTask}
            bulkUpdateTasks={bulkUpdateTasks}
            markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
            sections={sections}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            updateTaskParentAndOrder={updateTaskParentAndOrder}
            reorderSections={reorderSections}
            allCategories={allCategories}
            setIsAddTaskOpen={() => {}} // Not used in archive
            onOpenOverview={handleOpenTaskOverview}
            currentDate={new Date()}
            setCurrentDate={() => {}} // Not used in archive
            expandedSections={expandedSections}
            expandedTasks={expandedTasks}
            toggleTask={toggleTask}
            toggleSection={toggleSection}
            toggleAllSections={() => {}} // Not used in archive
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
          />
        )}
      </div>

      <TaskDetailDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskFromOverview}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks} // Pass processedTasks
      />

      <AlertDialog open={showConfirmDeleteAllDialog} onOpenChange={setShowConfirmDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete ALL archived tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAllArchived} disabled={isDeletingAll}>
              {isDeletingAll ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;