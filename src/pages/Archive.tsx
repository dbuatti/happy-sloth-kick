import React, { useState, useMemo, useRef } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Search, Filter, X, ListRestart, Archive as ArchiveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskItem from '@/components/TaskItem';
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
import BulkActionBar from '@/components/BulkActionBar';
import { useDebounce } from '@/hooks/useDebounce';
import { Skeleton } from "@/components/ui/skeleton"; // Added missing import

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date()); // Archive view doesn't change date
  const {
    tasks: rawTasks, // Renamed to rawTasks to distinguish from processedTasks
    processedTasks, // Use processedTasks for TaskItem
    filteredTasks,
    loading,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    searchFilter,
    setSearchFilter,
    // Removed statusFilter and setStatusFilter as they are not used in Archive UI
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sections,
    allCategories,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'archive', userId });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  // Removed isBulkUpdating as it was unused

  const debouncedSearchFilter = useDebounce(searchFilter, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchFilter('');
  };

  // Removed handleStatusChange as it was unused

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  const handlePriorityChange = (value: string) => {
    setPriorityFilter(value);
  };

  const clearAllFilters = () => {
    setSearchFilter('');
    // Removed setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
  };

  const isAnyFilterActive = searchFilter !== '' || categoryFilter !== 'all' || priorityFilter !== 'all'; // Removed statusFilter check

  // Removed handleToggleSelectTask as it was unused

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBulkComplete = async () => {
    if (selectedTaskIds.size === 0) return;
    // Removed setIsBulkUpdating(true);
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    // Removed setIsBulkUpdating(false);
  };

  const handleBulkArchive = async () => {
    if (selectedTaskIds.size === 0) return;
    // Removed setIsBulkUpdating(true);
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    // Removed setIsBulkUpdating(false);
  };

  const handleBulkChangePriority = async (priority: Task['priority']) => {
    if (selectedTaskIds.size === 0) return;
    // Removed setIsBulkUpdating(true);
    await bulkUpdateTasks({ priority }, Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    // Removed setIsBulkUpdating(false);
  };

  const handleDeleteSelectedClick = () => {
    if (selectedTaskIds.size > 0) {
      setShowConfirmDeleteDialog(true);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    setIsBulkDeleting(true);
    await bulkDeleteTasks(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    setShowConfirmDeleteDialog(false);
    setIsBulkDeleting(false);
  };

  const filteredAndSearchedTasks = useMemo(() => {
    return filteredTasks.filter(task =>
      task.status === 'archived' && // Only show archived tasks in this view
      (task.description?.toLowerCase().includes(debouncedSearchFilter.toLowerCase()) ||
       task.notes?.toLowerCase().includes(debouncedSearchFilter.toLowerCase()) ||
       task.link?.toLowerCase().includes(debouncedSearchFilter.toLowerCase()))
    );
  }, [filteredTasks, debouncedSearchFilter]);

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <ArchiveIcon className="h-8 w-8 text-primary" /> Task Archive
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              ref={searchInputRef}
              placeholder="Search archived tasks..."
              value={searchFilter}
              onChange={handleSearchChange}
              className="pl-10 h-9"
              disabled={isDemo}
            />
            {searchFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={handleClearSearch}
                disabled={isDemo}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 h-9" disabled={isDemo}>
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryFilter} onValueChange={handleCategoryChange} disabled={isDemo}>
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
                    <Select value={priorityFilter} onValueChange={handlePriorityChange} disabled={isDemo}>
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
                </div>
              </PopoverContent>
            </Popover>
            {isAnyFilterActive && (
              <Button variant="outline" onClick={clearAllFilters} className="gap-2 h-9" disabled={isDemo}>
                <ListRestart className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredAndSearchedTasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
            <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No archived tasks found.</p>
            <p className="text-sm">Your archive is empty or no tasks match your current filters.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredAndSearchedTasks.map(task => (
              <li key={task.id} className="relative rounded-xl p-2 transition-all duration-200 ease-in-out group hover:shadow-md">
                <TaskItem
                  task={task}
                  allTasks={processedTasks} // Changed from 'tasks' to 'processedTasks'
                  onStatusChange={async (taskId, newStatus) => { await updateTask(taskId, { status: newStatus }); return taskId; }}
                  onDelete={async (taskId) => { await deleteTask(taskId); }}
                  onUpdate={async (taskId, updates) => { await updateTask(taskId, updates); return taskId; }}
                  sections={sections}
                  onOpenOverview={() => {}}
                  currentDate={currentDate}
                  onMoveUp={async () => {}}
                  onMoveDown={async () => {}}
                  level={0}
                  isOverlay={false}
                  hasSubtasks={false} // Archive view doesn't show subtasks directly
                  isExpanded={false}
                  toggleTask={() => {}}
                  setFocusTask={setFocusTask}
                  isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                  toggleDoToday={toggleDoToday}
                  doTodayOffIds={doTodayOffIds}
                  scheduledTasksMap={new Map()} // Archive tasks are not scheduled
                  isDemo={isDemo}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTaskIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTaskIds.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleDeleteSelectedClick}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedTaskIds.size} selected task(s) and all their sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;