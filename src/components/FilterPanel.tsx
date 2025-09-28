"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskSection, Category } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FilterPanelProps {
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
  isOpen: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
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
  isOpen,
}) => {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 transition-all duration-300 ease-in-out overflow-hidden",
      isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
    )}>
      <div className="space-y-1">
        <Label htmlFor="search-tasks">Search Tasks</Label>
        <Input
          id="search-tasks"
          placeholder="Search tasks..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="status-filter">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter" className="w-full">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="to-do">To-Do</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="category-filter">Category</Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger id="category-filter" className="w-full">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(category => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="priority-filter">Priority</Label>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger id="priority-filter" className="w-full">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="section-filter">Section</Label>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger id="section-filter" className="w-full">
            <SelectValue placeholder="All Sections" />
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
    </div>
  );
};

export default FilterPanel;