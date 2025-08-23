import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, X, ListRestart } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { TaskSection, Category } from '@/hooks/useTasks';

interface TaskFilterProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  sectionFilter: string;
  setSectionFilter: (value: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  searchRef: React.RefObject<HTMLInputElement>;
}

const TaskFilter: React.FC<TaskFilterProps> = ({
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
  searchRef,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    setShowAdvanced(false);
  };

  const isAnyFilterActive = searchFilter !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || sectionFilter !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3 px-4 py-3"> {/* Removed mb-4, adjusted padding */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          ref={searchRef}
          placeholder="Search tasks..."
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
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
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
  );
};

export default TaskFilter;