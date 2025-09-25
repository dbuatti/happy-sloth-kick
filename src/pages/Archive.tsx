import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive as ArchiveIcon, Filter, Search, X, ListRestart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date()); // Use a fixed date for archive view
  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
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

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setIsTaskOverviewOpen(false);
    // If you have a separate TaskDetailDialog for editing, open it here.
    // For now, we'll just log and close.
    console.log("Edit task from overview:", task.id);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchFilter('');
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  const handlePriorityChange = (value: string) => {
    setPriorityFilter(value);
  };

  const handleSectionChange = (value: string) => {
    setSectionFilter(value);
  };

  const clearAllFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSectionFilter('all');
  };

  const isAnyFilterActive = searchFilter !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || sectionFilter !== 'all';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 bg-muted/40">
      <Card className="mb-6 shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
            <ArchiveIcon className="h-6 w-6" /> Archived Tasks
          </CardTitle>
          <p className="text-sm text-muted-foreground">Review and manage your archived tasks.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                ref={searchInputRef}
                placeholder="Search archived tasks..."
                value={searchFilter}
                onChange={handleSearchChange}
                className="pl-10 h-9"
              />
              {searchFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                  onClick={handleClearSearch}
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
                      <Label>Status</Label>
                      <Select value={statusFilter} onValueChange={handleStatusChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="to-do">To Do</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="skipped">Skipped</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={categoryFilter} onValueChange={handleCategoryChange}>
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
                      <Select value={priorityFilter} onValueChange={handlePriorityChange}>
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
                      <Select value={sectionFilter} onValueChange={handleSectionChange}>
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
                <Button variant="outline" onClick={clearAllFilters} className="gap-2 h-9">
                  <ListRestart className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <main className="flex-1 overflow-y-auto">
        <TaskList
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={loading}
          handleAddTask={handleAddTask}
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
          setIsAddTaskOpen={() => {}} // Not used in archive, provide empty function
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
          scheduledTasksMap={new Map()} // No scheduled tasks in archive
          isDemo={isDemo}
        />
      </main>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks} // Pass processedTasks
        />
      )}
    </div>
  );
};

export default Archive;