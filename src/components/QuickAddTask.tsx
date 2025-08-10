import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Task } from '@/hooks/useTasks';

interface QuickAddTaskProps {
  sectionId: string | null;
  onAddTask: (taskData: {
    description: string;
    section_id: string | null;
    category: string;
    priority: Task['priority'];
  }) => Promise<any>;
  defaultCategoryId: string;
  isDemo?: boolean;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({ sectionId, onAddTask, defaultCategoryId, isDemo = false }) => {
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !defaultCategoryId) return;

    setIsSaving(true);
    await onAddTask({
      description: description.trim(),
      section_id: sectionId,
      category: defaultCategoryId,
      priority: 'medium',
    });
    setIsSaving(false);
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2 py-1">
      <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Input
        placeholder="Add a task and press Enter..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
        disabled={isSaving || isDemo}
      />
    </form>
  );
};

export default QuickAddTask;