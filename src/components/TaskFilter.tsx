import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskSection, TaskCategory } from '@/types'; // Corrected import for Category to TaskCategory
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TaskFilterProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterCategory: string;
  setFilterCategory: (categoryId: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterDueDate: Date | undefined;
  setFilterDueDate: (date: Date | undefined) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  categories: TaskCategory[];
  sections: TaskSection[];
}

const TaskFilter: React.FC<TaskFilterProps> = ({
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  filterPriority,
  setFilterPriority,
  searchQuery,
  setSearchQuery,
  filterDueDate,
  setFilterDueDate,
  showCompleted,
  setShowCompleted,
  categories,
  sections,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Label htmlFor="status-filter">Status:</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger id="status-filter" className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="to-do">To Do</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="category-filter">Category:</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger id="category-filter" className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="priority-filter">Priority:</Label>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger id="priority-filter" className="w-[120px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="search-query">Search:</Label>
        <Input
          id="search-query"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[200px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="due-date-filter">Due Date:</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !filterDueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDueDate ? format(filterDueDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filterDueDate}
              onSelect={setFilterDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {filterDueDate && (
          <Button variant="ghost" size="sm" onClick={() => setFilterDueDate(undefined)}>
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="show-completed"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <Label htmlFor="show-completed">Show Completed</Label>
      </div>
    </div>
  );
};

export default TaskFilter;