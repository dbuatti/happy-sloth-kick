import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskStatus, TaskPriority } from '@/types/task';
import CategorySelector from './CategorySelector';
import SectionSelector from './SectionSelector';
import { TaskFilterProps } from '@/types/props';

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
  allCategories, // Renamed from categories to allCategories for consistency
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <Select value={statusFilter} onValueChange={(value: TaskStatus | 'all') => setStatusFilter(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="to-do">To-Do</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="skipped">Skipped</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      <CategorySelector
        allCategories={allCategories}
        selectedCategory={categoryFilter}
        onSelectCategory={setCategoryFilter}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        sections={sections}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createSection={createSection}
      />

      <Select value={priorityFilter || 'all'} onValueChange={(value: string) => setPriorityFilter(value === 'all' ? 'all' : value as TaskPriority)}>
        <SelectTrigger className="w-[180px]">
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

      <SectionSelector
        sections={sections}
        selectedSection={sectionFilter}
        onSelectSection={setSectionFilter}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allCategories={allCategories}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />
    </div>
  );
};

export default TaskFilter;