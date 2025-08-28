"use client";

import React from 'react';
import { TaskSection, Task } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskSectionProps {
  section: TaskSection;
  tasks?: Task[];
  selectedTaskIds?: string[];
  onTaskSelect?: (taskId: string) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  section,
  tasks = [],
  selectedTaskIds = [],
  onTaskSelect = () => {}
}) => {
  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-3">{section.name}</h2>
      
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
            <Checkbox
              checked={selectedTaskIds.includes(task.id)}
              onCheckedChange={() => onTaskSelect(task.id)}
            />
            <span className="flex-1">{task.description}</span>
          </div>
        ))}
        
        {tasks.length === 0 && (
          <p className="text-muted-foreground text-sm">No tasks in this section</p>
        )}
      </div>
    </div>
  );
};

export default TaskSection;