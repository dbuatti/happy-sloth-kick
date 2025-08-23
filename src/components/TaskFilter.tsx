import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskCategory, TaskSection } from '@/types';

interface TaskFilterProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterCategory: string;
  setFilterCategory: (categoryId: string) => void;
  filterSection: string;
  setFilterSection: (sectionId: string) => void;
  categories: TaskCategory[];
  sections: TaskSection[];
}

const TaskFilter: React.FC<TaskFilterProps> = ({
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  filterSection,
  setFilterSection,
  categories,
  sections,
}) => {
  return (
    <div className="flex space-x-2 mb-4">
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="to-do">To Do</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterSection} onValueChange={setFilterSection}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by Section" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sections</SelectItem>
          <SelectItem value="no-section">No Section</SelectItem>
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {section.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TaskFilter;