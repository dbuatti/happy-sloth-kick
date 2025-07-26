import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from 'lucide-react';

interface QuickAddTaskProps {
  onAddTask: (taskData: {
    description: string;
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
    remind_at: string | null;
    section_id: string | null;
  }) => Promise<any>;
  userId: string | null;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({ onAddTask, userId }) => {
  const [taskDescription, setTaskDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleQuickAdd = async () => {
    if (!taskDescription.trim()) {
      return;
    }

    setIsAdding(true);
    const success = await onAddTask({
      description: taskDescription,
      recurring_type: 'none', // Default to none
      category: 'general', // Default to general
      priority: 'medium', // Default to medium
      due_date: null,
      notes: null,
      remind_at: null,
      section_id: null,
    });

    if (success) {
      setTaskDescription('');
    }
    setIsAdding(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && taskDescription.trim()) {
      handleQuickAdd();
    }
  };

  return (
    <div className="mt-8 p-4 bg-gray-50 dark:bg-card rounded-lg flex items-center space-x-2">
      <Input
        placeholder="Quick add a new task..."
        value={taskDescription}
        onChange={(e) => setTaskDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isAdding || !userId}
        className="flex-1"
      />
      <Button onClick={handleQuickAdd} disabled={isAdding || !taskDescription.trim() || !userId}>
        <Plus className="h-4 w-4 mr-2" /> Add
      </Button>
    </div>
  );
};

export default QuickAddTask;