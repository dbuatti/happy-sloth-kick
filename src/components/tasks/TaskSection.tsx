import React from 'react';
import { Task, TaskSection as TTaskSection } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import SortableTaskCard from './SortableTaskCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskActionProps } from '@/types/props';

export interface TaskSectionProps extends TaskActionProps {
  section: TTaskSection;
  tasks: Task[];
  onUpdateSection: (id: string, updates: Partial<TTaskSection>) => void;
  onDeleteSection: (id: string) => void;
  onAddTask: (sectionId: string) => void;
  onOpenTaskDetails: (task: Task) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  section,
  tasks,
  onUpdateSection,
  onDeleteSection,
  onAddTask,
  onUpdate,
  onDelete,
  onToggleComplete,
  onOpenTaskDetails,
}) => {
  return (
    <div className="mb-4 bg-card p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-card-foreground">{section.name}</h2>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => onAddTask(section.id)}>
            <PlusCircle className="h-5 w-5 text-muted-foreground hover:text-primary" />
            <span className="sr-only">Add Task</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" data-dnd-kit-skip-click>
                <span className="sr-only">Open section menu</span>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const newName = prompt('New section name:', section.name);
                if (newName && newName.trim() !== '') {
                  onUpdateSection(section.id, { name: newName.trim() });
                }
              }}>
                Rename Section
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTask(section.id)}>Add Task</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteSection(section.id)}>Delete Section</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="space-y-2">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No tasks in this section. Click '+' to add one!</p>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                id={task.id}
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleComplete={onToggleComplete}
                onOpenTaskDetails={onOpenTaskDetails}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default TaskSection;