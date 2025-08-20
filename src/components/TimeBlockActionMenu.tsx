import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  CalendarPlus, 
  ListTodo, 
  Clock
} from 'lucide-react';
import { Task, TaskSection } from '@/hooks/useTasks';
import { format } from 'date-fns';

interface TimeBlockActionMenuProps {
  block: { start: Date; end: Date };
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => void;
  unscheduledTasks: Task[];
  sections: TaskSection[];
}

const TimeBlockActionMenu: React.FC<TimeBlockActionMenuProps> = ({
  block,
  onAddAppointment,
  onScheduleTask,
  unscheduledTasks,
  sections,
}) => {
  // Group tasks by section for better organization
  const tasksBySection: Record<string, Task[]> = {};
  
  unscheduledTasks.forEach(task => {
    const sectionId = task.section_id || 'no-section';
    if (!tasksBySection[sectionId]) {
      tasksBySection[sectionId] = [];
    }
    tasksBySection[sectionId].push(task);
  });

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return 'No Section';
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : 'Unknown Section';
  };

  return (
    <div className="w-64 max-h-96 overflow-y-auto">
      <div className="p-1">
        <Button
          variant="ghost"
          className="w-full justify-start h-10 px-2"
          onClick={() => onAddAppointment(block)}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Add Appointment
        </Button>
      </div>
      
      {unscheduledTasks.length > 0 && (
        <div className="border-t mt-1 pt-1">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground flex items-center">
            <ListTodo className="mr-2 h-3 w-3" />
            Schedule Task
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {Object.entries(tasksBySection).map(([sectionId, tasks]) => (
              <div key={sectionId} className="py-1">
                {sectionId !== 'no-section' && (
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground truncate">
                    {getSectionName(sectionId === 'no-section' ? null : sectionId)}
                  </div>
                )}
                {tasks.map(task => (
                  <Button
                    key={task.id}
                    variant="ghost"
                    className="w-full justify-start h-10 px-2 text-sm"
                    onClick={() => onScheduleTask(task.id, block.start)}
                  >
                    <div className="flex items-center truncate">
                      <span className="truncate">{task.description}</span>
                    </div>
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="border-t mt-1 pt-2 px-2">
        <div className="text-xs text-muted-foreground flex items-center">
          <Clock className="mr-2 h-3 w-3" />
          {format(block.start, 'h:mm a')} - {format(block.end, 'h:mm a')}
        </div>
      </div>
    </div>
  );
};

export default TimeBlockActionMenu;