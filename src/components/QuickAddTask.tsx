import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Task } from '@/types'; // Import Task from '@/types'
import { toast } from 'react-hot-toast';

interface QuickAddTaskProps {
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: Task['priority']) => Promise<Task>;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({ onAddTask }) => {
  const [description, setDescription] = useState('');

  const handleAddTask = async () => {
    if (!description.trim()) {
      toast.error('Task description cannot be empty.');
      return;
    }
    try {
      await onAddTask(description, null, null, null, null, 'medium');
      setDescription('');
      toast.success('Task added quickly!');
    } catch (error) {
      toast.error('Failed to add task.');
      console.error('Error adding task:', error);
    }
  };

  return (
    <div className="flex w-full max-w-sm items-center space-x-2">
      <Input
        placeholder="Add a quick task..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleAddTask();
          }
        }}
      />
      <Button onClick={handleAddTask}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default QuickAddTask;