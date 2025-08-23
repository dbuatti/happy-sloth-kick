import React from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData } from '@/types'; // Corrected imports

interface TimeBlockActionMenuProps {
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: Task['priority']) => Promise<Task>;
  onAddAppointment: (title: string, startTime: string, endTime: string, color: string, taskId: string | null) => Promise<any>;
  onEditAppointment: () => void;
  onDeleteAppointment: () => void;
  availableTasks: Task[];
  availableSections: TaskSection[];
  availableCategories: TaskCategory[];
  selectedDate: Date;
  selectedTimeSlot: { start: Date; end: Date };
}

const TimeBlockActionMenu: React.FC<TimeBlockActionMenuProps> = ({
  onAddTask,
  onAddAppointment,
  onEditAppointment,
  onDeleteAppointment,
  availableTasks,
  availableSections,
  availableCategories,
  selectedDate,
  selectedTimeSlot,
}) => {
  const [taskToLink, setTaskToLink] = React.useState<string | null>(null);

  const handleAddTask = async () => {
    // Example: Add a generic task for the time slot
    const description = `New Task for ${selectedTimeSlot.start.toLocaleTimeString()} - ${selectedTimeSlot.end.toLocaleTimeString()}`;
    await onAddTask(description, null, null, selectedDate, null, 'medium');
  };

  const handleAddAppointment = async () => {
    const title = `New Appointment for ${selectedTimeSlot.start.toLocaleTimeString()}`;
    const startTime = format(selectedTimeSlot.start, 'HH:mm');
    const endTime = format(selectedTimeSlot.end, 'HH:mm');
    await onAddAppointment(title, startTime, endTime, '#3b82f6', taskToLink);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleAddAppointment}>
          <Plus className="mr-2 h-4 w-4" /> Add Appointment
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAddTask}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </DropdownMenuItem>
        {/*
        <DropdownMenuItem onClick={onEditAppointment}>
          <Edit className="mr-2 h-4 w-4" /> Edit Block
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDeleteAppointment}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete Block
        </DropdownMenuItem>
        */}
        <div className="p-2">
          <Label htmlFor="link-task" className="text-xs font-medium">Link Task</Label>
          <Select onValueChange={setTaskToLink} value={taskToLink || ''}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Link to task (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Task</SelectItem>
              {availableTasks.filter(t => t.status !== 'completed' && t.status !== 'archived').map(task => (
                <SelectItem key={task.id} value={task.id}>
                  {task.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TimeBlockActionMenu;