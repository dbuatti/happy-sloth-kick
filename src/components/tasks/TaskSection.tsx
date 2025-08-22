import React from 'react';
import { Droppable, Draggable, DraggableProvided } from '@hello-pangea/dnd'; // Import DraggableProvided
import { TaskCard } from './TaskCard';
import { Task } from '@/types';
import { cn } from '@/lib/utils'; // Assuming cn is available for class merging

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  droppableId: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskSection: React.FC<TaskSectionProps> = ({ title, tasks, droppableId, onEdit, onDelete }) => {
  return (
    <div className="bg-gray-100 p-4 rounded mb-4">
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[100px] touch-action-none", // Added touch-action-none
            )}
          >
            {tasks.map((task, index) => (
              <Draggable draggableId={task.id} index={index} key={task.id} disableInteractiveElementBlocking={true}> {/* Added disableInteractiveElementBlocking */}
                {(draggableProvided: DraggableProvided) => ( {/* Specify type for draggableProvided */}
                  <TaskCard
                    task={task}
                    index={index}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    provided={draggableProvided} // Pass draggableProvided to TaskCard
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};