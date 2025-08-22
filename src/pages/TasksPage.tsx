"use client";

import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { Task, TaskSection, TaskCategory } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { TaskDialog } from "@/components/TaskDialog";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useAuth } from '@/context/AuthContext';

export default function TasksPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    tasks,
    sections,
    categories,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    markAllTasksInSectionCompleted,
  } = useTasks({ currentDate: new Date(), userId });

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

  const handleAddTask = async (newTask: Partial<Task>) => {
    await addTask(newTask);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleUpdateSection = async (sectionId: string, newName: string) => {
    await updateSection(sectionId, newName);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const sectionTasks = tasks.filter(task => task.section_id === sectionId);
    if (sectionTasks.length > 0) {
      console.error("Cannot delete section with tasks. Please move or delete tasks first.");
      return;
    }
    await deleteSection(sectionId);
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
                    taskCount={activeTasks.filter((task) => task.section_id === section.id).length}
                    onEdit={handleUpdateSection}
                    onDelete={handleDeleteSection}
                    onAddTask={(sectionId) => {
                      setSelectedTask({
                        id: '',
                        description: null, // Allow null description
                        status: 'to-do',
                        user_id: userId || '',
                        section_id: sectionId || undefined,
                        created_at: new Date().toISOString(),
                      });
                      setIsTaskDialogOpen(true);
                    }}
                    onMarkAllCompleted={markAllTasksInSectionCompleted}
                    onToggleFocusMode={updateSectionIncludeInFocusMode}
                    isDemo={user?.id === 'd889323b-350c-4764-9788-6359f85f6142'}
                  />
                  <div className="mt-4 space-y-3">
                    {activeTasks
                      .filter((task) => task.section_id === section.id)
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((task: Task, index: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(providedDraggable) => (
                            <div
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                            >
                              <TaskCard
                                task={task}
                                categories={categories}
                                onEdit={() => { setSelectedTask(task); setIsTaskDialogOpen(true); }}
                                onDelete={handleDeleteTask}
                                onUpdate={handleUpdateTask}
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
        onSave={async (taskData: Partial<Task>) => { // Explicitly type taskData
          if (selectedTask?.id) {
            await handleUpdateTask(selectedTask.id, taskData);
          } else {
            await handleAddTask(taskData);
          }
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}