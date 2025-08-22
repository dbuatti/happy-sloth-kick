"use client";

import React, { useState, useRef } from "react";
import { Droppable, Draggable, DraggableProvided, DroppableProvided, DroppableStateSnapshot } from "@hello-pangea/dnd";
import { Task, TaskSection as TaskSectionType } from "@/types";
import TaskCard from "./TaskCard";
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TaskSectionProps {
  section: TaskSectionType;
  tasks: Task[];
  onAddTask: (sectionId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleCompleteTask: (id: string, status: "to-do" | "completed") => void;
  onToggleFocusTask: (id: string, isFocused: boolean) => void;
  focusedTaskId: string | null;
  index: number;
  allTasks: Task[];
}

const TaskSection: React.FC<TaskSectionProps> = ({
  section,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleCompleteTask,
  onToggleFocusTask,
  focusedTaskId,
  index,
  allTasks,
}) => {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(section.name);
  const [editedIncludeInFocusMode, setEditedIncludeInFocusMode] = useState(
    section.include_in_focus_mode
  );

  const sectionRef = useRef<HTMLDivElement>(null);

  const updateSectionMutation = useMutation({
    mutationFn: async (updatedSection: Partial<TaskSectionType>) => {
      const { data, error } = await supabase
        .from("task_sections")
        .update(updatedSection)
        .eq("id", section.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_sections"] });
      toast.success("Section updated successfully!");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to update section.");
      console.error("Error updating section:", error);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("task_sections")
        .delete()
        .eq("id", section.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_sections"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // Invalidate tasks as well, as they might be deleted via cascade
      toast.success("Section deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete section.");
      console.error("Error deleting section:", error);
    },
  });

  const handleSave = () => {
    if (!editedName.trim()) {
      toast.error("Section name cannot be empty.");
      return;
    }
    updateSectionMutation.mutate({
      name: editedName,
      include_in_focus_mode: editedIncludeInFocusMode,
    });
  };

  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="mb-6 w-full max-w-md mx-auto"
        >
          <div
            className="flex items-center justify-between mb-3 p-2 rounded-md bg-secondary text-secondary-foreground shadow-sm"
            ref={sectionRef}
          >
            <div className="flex items-center">
              <span {...provided.dragHandleProps} className="mr-2 cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </span>
              <h2 className="text-lg font-semibold">{section.name}</h2>
              {section.include_in_focus_mode ? (
                <Eye className="ml-2 h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="ml-2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onAddTask(section.id); }} // Prevent drag from starting
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 data-[state=open]:bg-muted"
                    onClick={(e) => e.stopPropagation()} // Prevent drag from starting
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Section Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setIsEditing(true);
                          setEditedName(section.name);
                          setEditedIncludeInFocusMode(section.include_in_focus_mode);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit Section
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit Section</DialogTitle>
                        <DialogDescription>
                          Make changes to your task section here.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Name
                          </Label>
                          <Input
                            id="name"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="focusMode" className="text-right">
                            Focus Mode
                          </Label>
                          <div className="col-span-3 flex items-center space-x-2">
                            <Checkbox
                              id="focusMode"
                              checked={editedIncludeInFocusMode}
                              onCheckedChange={(checked) =>
                                setEditedIncludeInFocusMode(checked as boolean)
                              }
                            />
                            <label
                              htmlFor="focusMode"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Include in Focus Mode
                            </label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="submit" onClick={handleSave}>
                          Save changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Section
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete this section and all tasks within it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSectionMutation.mutate()}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Droppable droppableId={section.id} type="task">
            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "min-h-[50px] rounded-md p-2",
                  snapshot.isDraggingOver && "bg-blue-50 dark:bg-blue-950"
                )}
              >
                {tasks.map((task, taskIndex) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={taskIndex}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onToggleComplete={onToggleCompleteTask}
                    onToggleFocus={onToggleFocusTask}
                    focusedTaskId={focusedTaskId}
                    allTasks={allTasks}
                    isDragging={snapshot.isDraggingOver}
                  />
                ))}
                {provided.placeholder}
                {tasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No tasks in this section.
                  </p>
                )}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
};

export default TaskSection;