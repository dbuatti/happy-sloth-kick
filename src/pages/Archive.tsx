import React, { useState, useCallback } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { Button } from '@/components/ui/button';
import { Archive as ArchiveIcon, Filter as FilterIcon } from 'lucide-react';
import FilterPanel from '@/components/FilterPanel';

interface ArchivePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchivePageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date()); // currentDate is not used for filtering in archive, but needed for useTasks hook
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('archived'); // Default to archived
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
    handleAddTask, // Not typically used in archive, but required by TaskList
    updateTask,
    deleteTask,
    sections,
    allCategories,
    updateTaskParentAndOrder, // Not typically used in archive, but required by TaskList
    reorderSections, // Not typically used in archive, but required by TaskList
    markAllTasksInSectionCompleted, // Not typically used in archive, but required by TaskList
    createSection, // Added to destructuring
    updateSection, // Added to destructuring
    deleteSection, // Added to destructuring
    updateSectionIncludeInFocusMode, // Added to destructuring
    setFocusTask, // Not typically used in archive, but required by TaskList
    doTodayOffIds, // Not typically used in archive, but required by TaskList
    toggleDoToday, // Not typically used in archive, but required by TaskList
  } = useTasks({
    currentDate,
    viewMode: 'archive',
    userId: demoUserId,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === undefined ? false : !prev[sectionId],
    }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  }, []);

  const toggleAllSections = useCallback(() => {
    const allCollapsed = Object.values(expandedSections).every(val => val === false);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = allCollapsed;
    });
    setExpandedSections(newExpandedState);
  }, [expandedSections, sections]);

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(prev => !prev);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('archived'); // Keep status as 'archived' for the archive page
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSectionFilter('all');
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="sticky top-0 z-10 flex flex-col bg-background bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--secondary)/0.05)] dark:from-[hsl(var(--primary)/0.1)] dark:to-[hsl(var(--secondary)/0.1)] rounded-b-2xl shadow-lg pb-4 px-4 lg:px-6">
        <div className="flex items-center justify-between pt-4 pb-3">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArchiveIcon className="h-7 w-7 text-primary" /> Archive
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFilterPanel}
            className="flex items-center gap-2"
            aria-expanded={isFilterPanelOpen}
            aria-controls="filter-panel"
          >
            <FilterIcon className="h-4 w-4" />
            Filters
          </Button>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage your archived tasks.
        </p>
      </div>

      <FilterPanel
        isOpen={isFilterPanelOpen}
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
        onClearFilters={handleClearFilters}
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <TaskList
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={tasksLoading}
          handleAddTask={handleAddTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
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
          scheduledTasksMap={new Map()} // Archive doesn't typically show scheduled tasks
          isDemo={isDemo}
          selectedTaskIds={new Set()} // Pass empty set for archive
          onSelectTask={() => {}} // No-op for archive
        />
      </div>

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
    </div>
  );
};

export default Archive;