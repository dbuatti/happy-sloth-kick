import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, Appointment, NewAppointmentData } from '@/types';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface TimeBlockActionMenuProps {
  block: { start: Date; end: Date };
  onAddAppointment: (title: string, startTime: string, endTime: string, color: string, taskId?: string | null) => Promise<Appointment>;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
  onScheduleTask: (task: Task, startTime: string, endTime: string) => Promise<Appointment>;
  availableTasks: Task[];
  availableSections: TaskSection[];
  availableCategories: TaskCategory[];
  selectedDate: Date;
  selectedTimeSlot: { start: Date; end: Date };
}

const TimeBlockActionMenu: React.FC<TimeBlockActionMenuProps> = ({
  block,
  onAddAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onScheduleTask,
  availableTasks,
  availableSections,
  availableCategories,
  selectedDate,
  selectedTimeSlot,
}) => {
  const [taskToLink, setTaskToLink] = useState<string | null>(null);

  const handleAddAppointment = async () => {
    const title = `New Appointment for ${selectedTimeSlot.start.toLocaleTimeString()}`;
    const startTime = format(selectedTimeSlot.start, 'HH:mm');
    const endTime = format(selectedTimeSlot.end, 'HH:mm');
    await onAddAppointment(title, startTime, endTime, '#3b82f6', taskToLink);
  };

  const handleScheduleTask = async () => {
    if (!taskToLink) return;
    const task = availableTasks.find(t => t.id === taskToLink);
    if (!task) return;

    const startTime = format(selectedTimeSlot.start, 'HH:mm');
    const endTime = format(selectedTimeSlot.end, 'HH:mm');
    await onScheduleTask(task, startTime, endTime);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleAddAppointment}>
          <Plus className="mr-2 h-4 w-4" /> Add Appointment
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleScheduleTask} disabled={!taskToLink}>
          <Plus className="mr-2 h-4 w-4" /> Schedule Task
        </DropdownMenuItem>
        <div className="p-2">
          <Label htmlFor="link-task" className="text-xs font-medium">Link Task</Label>
          <Select onValueChange={setTaskToLink} value={taskToLink || ''}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a task" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Task</SelectItem>
              {availableTasks.filter((t: Task) => t.status !== 'completed' && t.status !== 'archived').map((task: Task) => (
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