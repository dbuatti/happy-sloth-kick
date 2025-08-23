import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ListTodo } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection } from '@/hooks/useTasks';

interface TimeBlockActionMenuProps {
  block: { start: Date; end: Date };
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => void;
  unscheduledTasks: Task[];
  sections: TaskSection[];
}

const TimeBlockActionMenu: React.FC<TimeBlockActionMenuProps> = ({ block, onAddAppointment, onScheduleTask, unscheduledTasks, sections }) => {
  const [view, setView] = useState<'initial' | 'select-task'>('initial');

  if (view === 'select-task') {
    return (
      <Select onValueChange={(taskId) => onScheduleTask(taskId, block.start)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a task..." />
        </SelectTrigger>
        <SelectContent>
          {unscheduledTasks.length > 0 ? (
            unscheduledTasks.map(task => {
              const section = sections.find(s => s.id === task.section_id);
              return (
                <SelectItem key={task.id} value={task.id}>
                  <div className="flex flex-col items-start">
                    <span>{task.description}</span>
                    {section && (
                      <span className="text-xs text-muted-foreground">{section.name}</span>
                    )}
                  </div>
                </SelectItem>
              );
            })
          ) : (
            <div className="p-2 text-sm text-muted-foreground">No tasks to schedule.</div>
          )}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex flex-col space-y-1">
      <Button variant="ghost" className="justify-start" onClick={() => onAddAppointment(block)}>
        <Calendar className="mr-2 h-4 w-4" />
        Add Appointment
      </Button>
      <Button variant="ghost" className="justify-start" onClick={() => setView('select-task')}>
        <ListTodo className="mr-2 h-4 w-4" />
        Schedule Task
      </Button>
    </div>
  );
};

export default TimeBlockActionMenu;