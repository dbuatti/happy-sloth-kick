import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import CategorySelector from "./CategorySelector";

interface TaskFilterProps {
  onFilterChange: (filters: {
    search: string;
    status: string;
    category: string;
    priority: string;
  }) => void;
}

const TaskFilter: React.FC<TaskFilterProps> = ({ onFilterChange }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyFilters = () => {
    onFilterChange({ search, status, category, priority });
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setCategory('all');
    setPriority('all');
    onFilterChange({ search: '', status: 'all', category: 'all', priority: 'all' });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
          className="pl-10"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={() => {
              setSearch('');
              applyFilters();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
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
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  {/* Categories will be populated dynamically */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={applyFilters}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TaskFilter;