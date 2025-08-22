import React, { useState } from "react";
import { Droppable, Draggable, DraggableProvided, DroppableProvided, DroppableStateSnapshot } from "@hello-pangea/dnd";
import { Task, TaskSection as TaskSectionType } from "@/types";
import TaskCard from "./TaskCard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskSectionProps {
  section: TaskSectionType;
  tasks: Task[];
  onAddTask: (sectionId: string) => void;
  onTaskUpdate: (updatedTask: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onMoveTaskToSection: (taskId: string, sectionId: string | null) => void;
  onMoveTaskToToday: (task: Task) => void;
  onMoveTaskToTomorrow: (task: Task) => void;
  onMoveTaskToThisWeek: (task: Task) => void;
  onMoveTaskToFuture: (task: Task) => void;
  allSections: TaskSectionType[];
}

const TaskSection: React.FC<TaskSectionProps> = ({
  section,
  tasks,
  onAddTask,
  onTaskUpdate,
  onTaskDelete,
  onMoveTaskToSection,
  onMoveTaskToToday,
  onMoveTaskToTomorrow,
  onMoveTaskToThisWeek,
  onMoveTaskToFuture,
  allSections,
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const handleToggleSubtasks = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getSubtasks = (parentId: string) => {
    return tasks.filter((task) => task.parent_task_id === parentId);
  };

  const getTopLevelTasks = () => {
    return tasks.filter((task) => !task.parent_task_id);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{section.name}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddTask(section.id)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Task
        </Button>
      </div>

      <Droppable droppableId={section.id}>
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "min-h-[50px] rounded-md transition-colors",
              snapshot.isDraggingOver ? "bg-blue-50" : "bg-transparent"
            )}
          >
            {getTopLevelTasks().map((task, index) => (
              <React.Fragment key={task.id}>
                <Draggable draggableId={task.id} index={index} disableInteractiveElementBlocking={true}>
                  {(provided: DraggableProvided) => (
                    <TaskCard
                      task={task}
                      provided={provided}
                      isDragging={snapshot.isDraggingOver}
                      onTaskUpdate={onTaskUpdate}
                      onTaskDelete={onTaskDelete}
                      onAddTask={onAddTask}
                      subtasks={getSubtasks(task.id)}
                      onToggleSubtasks={handleToggleSubtasks}
                      showSubtasks={expandedTasks.has(task.id)}
                      onMoveTaskToSection={onMoveTaskToSection}
                      onMoveTaskToToday={onMoveTaskToToday}
                      onMoveTaskToTomorrow={onMoveTaskToTomorrow}
                      onMoveTaskToThisWeek={onMoveTaskToThisWeek}
                      onMoveTaskToFuture={onMoveTaskToFuture}
                      allSections={allSections}
                    />
                  )}
                </Draggable>
                {expandedTasks.has(task.id) && (
                  <div className="ml-6">
                    {getSubtasks(task.id).map((subtask, subtaskIndex) => (
                      <Draggable draggableId={subtask.id} index={index + subtaskIndex + 1} key={subtask.id} disableInteractiveElementBlocking={true}>
                        {(provided: DraggableProvided) => (
                          <TaskCard
                            task={subtask}
                            provided={provided}
                            isDragging={snapshot.isDraggingOver}
                            onTaskUpdate={onTaskUpdate}
                            onTaskDelete={onTaskDelete}
                            onAddTask={onAddTask}
                            isSubtask={true}
                            onMoveTaskToSection={onMoveTaskToSection}
                            onMoveTaskToToday={onMoveTaskToToday}
                            onMoveTaskToTomorrow={onMoveTaskToTomorrow}
                            onMoveTaskToThisWeek={onMoveTaskToThisWeek}
                            onMoveTaskToFuture={onMoveTaskToFuture}
                            allSections={allSections}
                          />
                        )}
                      </Draggable>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default TaskSection;