"use client";

import React from 'react';
import { TaskSection, Task } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Circle, CheckCircle, MoreHorizontal } from 'lucide-react';

interface TaskSectionProps {
  section: TaskSection;
  tasks?: Task[];
  selectedTaskIds?: string[];
  onTaskSelect?: (taskId: string) => void;
  onTaskToggle?: (taskId: string) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  section,
  tasks = [],
  selectedTaskIds = [],
  onTaskSelect = () => {},
  onTaskToggle = () => {}
}) => {
  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-3">{section.name}</h2>
      
      <div className="space-y-2">
        {tasks.map((task) => {
          const isSelected = selectedTaskIds.includes(task.id);
          const isCompleted = task.status === 'completed';
          
          return (
            <div 
              key={task.id} 
              className={`flex items-center gap-2 p-2 rounded transition-colors ${
                isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
              }`}
            >
              {/* Selection checkbox */}
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onTaskSelect(task.id)}
                className="mr-2"
              />
              
              {/* Task completion toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto"
                onClick={() => onTaskToggle(task.id)}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
              
              <span className={`flex-1 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {task.description}
              </span>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        
        {tasks.length === 0 && (
          <p className="text-muted-foreground text-sm">No tasks in this section</p>
        )}
      </div>
    </div>
  );
};

export default TaskSection;