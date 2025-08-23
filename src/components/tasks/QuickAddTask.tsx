import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskSection } from '@/types/task-management';
import { toast } from 'sonner';

interface QuickAddTaskProps {
  onAddTask: (description: string, sectionId: string | null) => void;
  sections: TaskSection[];
  defaultSectionId?: string;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({ onAddTask, sections, defaultSectionId }) => {
  const [description, setDescription] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(defaultSectionId || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Task description cannot be empty.');
      return;
    }
    onAddTask(description, selectedSectionId);
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <Input
        type="text"
        placeholder="Quick add a task..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-grow"
      />
      <Select value={selectedSectionId || ''} onValueChange={setSelectedSectionId}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select section" />
        </SelectTrigger>
        <SelectContent>
          {sections.map((sec) => (
            <SelectItem key={sec.id} value={sec.id}>
              {sec.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" className="flex-shrink-0">
        <Plus className="mr-2 h-4 w-4" /> Add
      </Button>
    </form>
  );
};

export default QuickAddTask;