import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import { format } from 'date-fns'; // Added import for format

interface AddTaskFormProps {
  onAddTask: (taskData: {
    description: string;
    is_daily_recurring: boolean;
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
  }) => Promise<any>;
  userId: string | null;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, userId }) => {
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [isNewTaskDailyRecurring, setIsNewTaskDailyRecurring] = useState<boolean>(false);
  const [newTaskCategory, setNewTaskCategory] = useState<string>('general');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async () => {
    if (!newTaskDescription.trim()) {
      // Error handling is done in useTasks hook
      return;
    }
    setIsAdding(true);
    const success = await onAddTask({
      description: newTaskDescription,
      is_daily_recurring: isNewTaskDailyRecurring,
      category: newTaskCategory,
      priority: newTaskPriority,
      due_date: newTaskDueDate ? newTaskDueDate.toISOString() : null,
      notes: newTaskNotes || null,
    });
    if (success) {
      setNewTaskDescription('');
      setIsNewTaskDailyRecurring(false);
      setNewTaskCategory('general');
      setNewTaskPriority('medium');
      setNewTaskDueDate(undefined);
      setNewTaskNotes('');
    }
    setIsAdding(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && newTaskDescription.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="mb-8 p-6 bg-gray-50 dark:bg-card rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Add New Task</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="new-task-description">Task Description</Label>
          <Input
            id="new-task-description"
            placeholder="Task description"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAdding}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategorySelector value={newTaskCategory} onChange={setNewTaskCategory} userId={userId} />
          <PrioritySelector value={newTaskPriority} onChange={setNewTaskPriority} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newTaskDueDate && "text-muted-foreground"
                  )}
                  disabled={isAdding}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={newTaskDueDate}
                  onSelect={setNewTaskDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="daily-recurring"
              checked={isNewTaskDailyRecurring}
              onCheckedChange={setIsNewTaskDailyRecurring}
              disabled={isAdding}
            />
            <Label htmlFor="daily-recurring">Daily Recurring</Label>
          </div>
        </div>
        
        <div>
          <Label htmlFor="new-task-notes">Notes</Label>
          <Textarea
            id="new-task-notes"
            placeholder="Add notes about this task..."
            value={newTaskNotes}
            onChange={(e) => setNewTaskNotes(e.target.value)}
            rows={3}
            disabled={isAdding}
          />
        </div>
        
        <Button onClick={handleSubmit} className="w-full" disabled={isAdding}>
          {isAdding ? 'Adding...' : 'Add Task'}
        </Button>
      </div>
    </div>
  );
};

export default AddTaskForm;