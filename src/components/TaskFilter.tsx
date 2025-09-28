"use client";

import React, { useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskSection, Category } from '@/hooks/useTasks';
import { Search, XCircle, Filter, Tag, ListTodo, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component

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
  const hasActiveFilters = useMemo(() => {
    return searchFilter !== '' ||
           statusFilter !== 'all' ||
           categoryFilter !== 'all' ||
           priorityFilter !== 'all' ||
           sectionFilter !== 'all';
  }, [searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  const clearAllFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSectionFilter('all');
  };

  const getCategoryName = (id: string) => allCategories.find(c => c.id === id)?.name || id;
  const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || (id === 'no-section' ? 'No Section' : id);

  return (
    <div className="px-4 pt-4 border-t border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search tasks..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
          {searchFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent"
              onClick={() => setSearchFilter('')}
              aria-label="Clear search"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
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
            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
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
            <AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground" />
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
            <ListTodo className="mr-2 h-4 w-4 text-muted-foreground" />
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
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Active Filters:</span>
          {searchFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="h-3 w-3" /> {searchFilter}
              <XCircle className="h-3 w-3 cursor-pointer" onClick={() => setSearchFilter('')} />
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" /> {statusFilter}
              <XCircle className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" /> {getCategoryName(categoryFilter)}
              <XCircle className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
            </Badge>
          )}
          {priorityFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {priorityFilter}
              <XCircle className="h-3 w-3 cursor-pointer" onClick={() => setPriorityFilter('all')} />
            </Badge>
          )}
          {sectionFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <ListTodo className="h-3 w-3" /> {getSectionName(sectionFilter)}
              <XCircle className="h-3 w-3 cursor-pointer" onClick={() => setSectionFilter('all')} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-xs">
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

export default TaskFilter;