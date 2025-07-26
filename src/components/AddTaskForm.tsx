import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Keep Switch for now, will replace
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select imports

interface AddTaskFormProps {
  onAddTask: (taskData: {
    description: string;
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly'; // Updated type
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
  }) => Promise<any>;
  userId: string | null;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, userId }) => {
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [newTaskRecurringType, setNewTaskRecurringType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none'); // New state for recurring type
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
      recurring_type: newTaskRecurringType, // Use new recurring type
      category: newTaskCategory,
      priority: newTaskPriority,
      due_date: newTaskDueDate ? newTaskDueDate.toISOString() : null,
      notes: newTaskNotes || null,
    });
    if (success) {
      setNewTaskDescription('');
      setNewTaskRecurringType('none'); // Reset recurring type
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
          
          <div className="space-y-2"> {/* Changed from flex items-center to space-y-2 for Label/Select */}
            <Label htmlFor="recurring-type">Recurring</Label>
            <Select 
              value={newTaskRecurringType} 
              onValueChange={(value) => setNewTaskRecurringType(value as 'none' | 'daily' | 'weekly' | 'monthly')} 
              disabled={isAdding}
            >
              <SelectTrigger id="recurring-type">
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
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