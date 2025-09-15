import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from 'lucide-react';

interface ProjectActionsBarProps {
  onAddProjectClick: () => void;
  sortOption: 'name_asc' | 'count_asc' | 'count_desc' | 'created_at_asc' | 'created_at_desc';
  onSortChange: (value: 'name_asc' | 'count_asc' | 'count_desc' | 'created_at_asc' | 'created_at_desc') => void;
  isSavingProject: boolean;
  isDemo: boolean;
}

const ProjectActionsBar: React.FC<ProjectActionsBarProps> = ({
  onAddProjectClick,
  sortOption,
  onSortChange,
  isSavingProject,
  isDemo,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
      <Button disabled={isSavingProject || isDemo} className="w-full sm:w-auto h-9" onClick={onAddProjectClick}>
        <Plus className="mr-2 h-4 w-4" /> Add Project
      </Button>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Label htmlFor="sort-by">Sort by:</Label>
        <Select value={sortOption} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Sort projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Alphabetical (A-Z)</SelectItem>
            <SelectItem value="count_asc">Tally (Low to High)</SelectItem>
            <SelectItem value="count_desc">Tally (High to Low)</SelectItem>
            <SelectItem value="created_at_asc">Oldest First</SelectItem>
            <SelectItem value="created_at_desc">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ProjectActionsBar;