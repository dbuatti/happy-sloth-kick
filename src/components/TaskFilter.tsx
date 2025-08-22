import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TaskFilterProps } from '@/types/props';
import { TaskPriority, TaskStatus } from '@/types/task';

const TaskFilter: React.FC<TaskFilterProps> = ({
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  sectionFilter,
  setSectionFilter,
  sections,
  categories,
}) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex-1 min-w-[150px]">
        <Label htmlFor="status-filter" className="sr-only">Status</Label>
        <Select value={statusFilter} onValueChange={(value: TaskStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger id="status-filter">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="to-do">To Do</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <Label htmlFor="category-filter" className="sr-only">Category</Label>
        <Select value={categoryFilter || 'all'} onValueChange={(value: string | 'all') => setCategoryFilter(value)}>
          <SelectTrigger id="category-filter">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <Label htmlFor="priority-filter" className="sr-only">Priority</Label>
        <Select value={priorityFilter || 'all'} onValueChange={(value: TaskPriority | 'all') => setPriorityFilter(value)}>
          <SelectTrigger id="priority-filter">
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
      </div>

      <div className="flex-1 min-w-[150px]">
        <Label htmlFor="section-filter" className="sr-only">Section</Label>
        <Select value={sectionFilter || 'all'} onValueChange={(value: string | 'all') => setSectionFilter(value)}>
          <SelectTrigger id="section-filter">
            <SelectValue placeholder="Filter by Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map(section => (
              <SelectItem key={section.id} value={section.id}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TaskFilter;