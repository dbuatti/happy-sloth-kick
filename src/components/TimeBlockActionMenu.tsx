"use client";

import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react'; // Removed unused ListTodo
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from '@/types/task'; // Corrected import, removed TaskSection
import { format, parseISO } from 'date-fns';

interface TimeBlockActionMenuProps {
  onAddTask: (time: string) => void;
  onAddAppointment: (time: string) => void;
  onEditAppointment: () => void;
  onDeleteAppointment: () => void;
  onAssignTask: (taskId: string | null) => void;
  availableTasks: Task[];
  selectedTime: string;
  currentAppointmentTaskId?: string | null;
  isAppointmentSelected: boolean;
}

const TimeBlockActionMenu: React.FC<TimeBlockActionMenuProps> = ({
  onAddTask,
  onAddAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onAssignTask,
  availableTasks,
  selectedTime,
  currentAppointmentTaskId,
  isAppointmentSelected,
}) => {
  const formattedTime = format(parseISO(`2000-01-01T${selectedTime}`), 'h:mm a');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Clock className="mr-2 h-4 w-4" /> {formattedTime} Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onAddTask(selectedTime)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddAppointment(selectedTime)}>
          <CalendarIcon className="mr-2 h-4 w-4" /> Add Appointment
        </DropdownMenuItem>
        {isAppointmentSelected && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEditAppointment}>
              <Edit className="mr-2 h-4 w-4" /> Edit Appointment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteAppointment} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Appointment
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-sm font-medium text-muted-foreground">Assign Task</div>
        <div className="px-2">
          <Select
            value={currentAppointmentTaskId || "null"}
            onValueChange={(value) => onAssignTask(value === "null" ? null : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select task to assign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Unassign Task</SelectItem>
              {availableTasks.map(task => (
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