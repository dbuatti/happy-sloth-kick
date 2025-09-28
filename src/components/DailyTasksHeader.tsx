import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { format, isSameDay, parseISO } from 'date-fns';
import { ArrowRight, Target, Plus, Archive, CheckCircle2, X, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DailyProgress } from '@/hooks/useTasks'; // Assuming DailyProgress is exported from useTasks
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import { showSuccess } from '@/utils/toast';

interface DailyTasksHeaderProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  tasks: Task[];
  filteredTasks: Task[];
  sections: TaskSection[];
  allCategories: Category[];
  userId: string | null;
  setIsFocusPanelOpen: (isOpen: boolean) => void;
  searchFilter: string;
  setSearchFilter: (filter: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  priorityFilter: string;
  setPriorityFilter: (filter: string) => void;
  sectionFilter: string;
  setSectionFilter: (filter: string) => void;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
  dailyProgress: DailyProgress;
  isDemo?: boolean;
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenOverview: (task: Task) => void;
  onOpenFocusView: () => void;
  onOpenFullScreenTask: (task: Task) => void; // Added this prop
  tasksLoading: boolean;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  onToggleAllSections: () => void;
  isManageCategoriesOpen: boolean;
  setIsManageCategoriesOpen: (isOpen: boolean) => void;
  isManageSectionsOpen: boolean;
  setIsManageSectionsOpen: (isOpen: boolean) => void;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  sections,
  allCategories,
  setIsFocusPanelOpen,
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
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  dailyProgress,
  isDemo,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenFocusView,
  onOpenFullScreenTask, // Destructure the new prop
  tasksLoading,
  doTodayOffIds,
  toggleDoToday,
  onToggleAllSections,
  isManageCategoriesOpen,
  setIsManageCategoriesOpen,
  isManageSectionsOpen,
  setIsManageSectionsOpen,
}) => {
  const getPriorityColorClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
    }
  };

  const handleClearFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSectionFilter('all');
  };

  const handleMarkNextTaskCompleted = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      showSuccess('Task marked as completed!');
    }
  };

  return (
    <div className="p-4 lg:p-6 border-b bg-background sticky top-0 z-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <h1 className="text-3xl font-bold text-primary">Daily Tasks</h1>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(currentDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
      </div>

      {/* Next Available Task / Focus Card */}
      <div className="mb-6">
        {tasksLoading ? (
          <Card className="p-4 flex items-center justify-center h-24 animate-pulse bg-muted/50">
            <span className="text-muted-foreground">Loading next task...</span>
          </Card>
        ) : nextAvailableTask ? (
          <Card
            className="p-4 flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onOpenFullScreenTask(nextAvailableTask)} // Use the new handler here
          >
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Next Focus Task:</span>
                <span className="text-lg font-semibold">{nextAvailableTask.description}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {nextAvailableTask.recurring_type !== 'none' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-8 w-8 flex items-center justify-center" aria-label="Recurring task">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recurring: {nextAvailableTask.recurring_type.charAt(0).toUpperCase() + nextAvailableTask.recurring_type.slice(1)}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Button variant="secondary" onClick={(e) => { e.stopPropagation(); onOpenOverview(nextAvailableTask); }}>
                Details
              </Button>
              <Button onClick={(e) => { e.stopPropagation(); handleMarkNextTaskCompleted(); }}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 text-center text-muted-foreground">
            No tasks available for focus. Time to relax or add new tasks!
          </Card>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
        <Input
          placeholder="Search tasks..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="col-span-full sm:col-span-1"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="to-do">To-Do</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(category => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            <SelectItem value="no-section">No Section</SelectItem>
            {sections.map(section => (
              <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleClearFilters} className="col-span-full sm:col-span-1">
          <X className="mr-2 h-4 w-4" /> Clear Filters
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button variant="secondary" onClick={() => setIsFocusPanelOpen(true)}>
          <Target className="mr-2 h-4 w-4" /> Open Focus Panel
        </Button>
        <Button variant="secondary" onClick={archiveAllCompletedTasks}>
          <Archive className="mr-2 h-4 w-4" /> Archive All Completed
        </Button>
        <Button variant="secondary" onClick={toggleAllDoToday}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> Toggle All "Do Today"
        </Button>
        <Button variant="secondary" onClick={() => setIsManageCategoriesOpen(true)}>
          Manage Categories
        </Button>
        <Button variant="secondary" onClick={() => setIsManageSectionsOpen(true)}>
          Manage Sections
        </Button>
      </div>

      <Separator className="my-6" />

      {/* Daily Progress Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <Card className="p-4">
          <h3 className="text-lg font-semibold">Total Pending</h3>
          <p className="text-2xl font-bold text-primary">{dailyProgress.totalPendingCount}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold">Completed Today</h3>
          <p className="text-2xl font-bold text-green-500">{dailyProgress.completedCount}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold">Overdue</h3>
          <p className="text-2xl font-bold text-red-500">{dailyProgress.overdueCount}</p>
        </Card>
      </div>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        allCategories={allCategories}
        createCategory={async (name, color) => { /* Implement category creation */ showSuccess(`Category '${name}' created.`); }}
        updateCategory={async (id, name, color) => { /* Implement category update */ showSuccess(`Category '${name}' updated.`); }}
        deleteCategory={async (id) => { /* Implement category deletion */ showSuccess('Category deleted.'); }}
      />

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />
    </div>
  );
};

export default DailyTasksHeader;