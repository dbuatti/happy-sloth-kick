"use client";

import React, { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskSections } from "@/hooks/useTaskSections";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { Task, TaskSection } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { TaskDialog } from "@/components/TaskDialog";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function TasksPage() {
  const {
    tasks,
    addTask: handleAddTask, // Renamed to avoid conflict with local function
    // updateTask, // Removed as it's not directly used in this component's rendering logic
    // deleteTask, // Removed as it's not directly used in this component's rendering logic
  } = useTasks();
  const {
    sections,
    addSection,
    updateSection,
    deleteSection,
    // reorderSections, // Removed as it's not directly used in this component's rendering logic
    updateSectionIncludeInFocusMode,
  } = useTaskSections();
  const { categories } = useTaskCategories();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const activeTasks = useMemo(() => {
    return tasks.filter((task) => task.status !== "completed");
  }, [tasks]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const { source, destination, draggableId } = result;

    // Reordering within the same section
    if (source.droppableId === destination.droppableId) {
      // Logic for reordering tasks within a section (not implemented in this snippet)
      console.log(`Reordering task ${draggableId} within section ${source.droppableId}`);
    } else {
      // Moving task to a different section
      console.log(`Moving task ${draggableId} from section ${source.droppableId} to ${destination.droppableId}`);
      // Logic for updating task's section_id (not implemented in this snippet)
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Tasks</h1>

      <div className="flex justify-end mb-4">
        <Button onClick={() => { setSelectedTask(null); setIsTaskDialogOpen(true); }}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section: TaskSection) => (
            <Droppable droppableId={section.id} key={section.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-card p-4 rounded-lg shadow-sm min-h-[200px]"
                >
                  <SectionHeader
                    section={section}
                    taskCount={activeTasks.filter((task: Task) => task.section_id === section.id).length}
                    onEdit={() => { /* Open section edit dialog */ }}
                    onDelete={() => deleteSection(section.id)}
                    onToggleFocusMode={(id, include) => updateSectionIncludeInFocusMode(id, include)}
                  />
                  <div className="mt-4 space-y-3">
                    {activeTasks
                      .filter((task: Task) => task.section_id === section.id)
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((task: Task, index: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskCard
                                task={task}
                                categories={categories}
                                onEdit={() => { setSelectedTask(task); setIsTaskDialogOpen(true); }}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <TaskDialog
        isOpen={isTaskDialogOpen}
        setIsOpen={setIsTaskDialogOpen}
        task={selectedTask}
        categories={categories}
        sections={sections}
        onSave={handleAddTask} // This will either add or update based on 'task' prop
      />
    </div>
  );
}