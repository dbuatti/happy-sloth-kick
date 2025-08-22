"use client";

import React, { useState, useEffect, useRef } from "react";
import { DraggableProvided } from "@hello-pangea/dnd";
import {
  Edit,
  Trash,
  Calendar,
  Tag,
  List,
  Clock,
  Repeat,
  Link as LinkIcon,
  Image as ImageIcon,
  MoreVertical,
  ArrowRight,
  X,
  AlertCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { Task, TaskSection } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { format, isToday, isPast, isTomorrow, isThisWeek, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";
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
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { useTaskSections } from "@/hooks/useTaskSections";
import { useDoTodayOffLog } from "@/hooks/useDoTodayOffLog";

export interface TaskCardProps {
  task: Task;
  provided: DraggableProvided;
  isDragging: boolean;
  onTaskUpdate: (updatedTask: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onAddTask: (parentId: string) => void;
  subtasks?: Task[];
  isSubtask?: boolean;
  onToggleSubtasks?: (taskId: string) => void;
  showSubtasks?: boolean;
  onMoveTaskToSection: (taskId: string, sectionId: string | null) => void;
  onMoveTaskToToday: (task: Task) => void;
  onMoveTaskToTomorrow: (task: Task) => void;
  onMoveTaskToThisWeek: (task: Task) => void;
  onMoveTaskToFuture: (task: Task) => void;
  allSections: TaskSection[];
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  provided,
  isDragging,
  onTaskUpdate,
  onTaskDelete,
  onAddTask,
  subtasks = [],
  isSubtask = false,
  onToggleSubtasks,
  showSubtasks,
  onMoveTaskToSection,
  onMoveTaskToToday,
  onMoveTaskToTomorrow,
  onMoveTaskToThisWeek,
  onMoveTaskToFuture,
  allSections,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedNotes, setEditedNotes] = useState(task.notes || "");
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    task.due_date ? parseISO(task.due_date) : undefined
  );
  const [editedRemindAt, setEditedRemindAt] = useState<Date | undefined>(
    task.remind_at ? parseISO(task.remind_at) : undefined
  );
  const [editedCategory, setEditedCategory] = useState<string | null>(task.category || null);
  const [editedPriority, setEditedPriority] = useState(task.priority);
  const [editedSectionId, setEditedSectionId] = useState<string | null>(task.section_id || null);
  const [editedRecurringType, setEditedRecurringType] = useState<
    Task["recurring_type"]
  >(task.recurring_type || "none");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const user = useUser();
  const { data: categories } = useTaskCategories();
  const { data: sections } = useTaskSections();
  const { data: doTodayOffLog, refetch: refetchDoTodayOffLog } = useDoTodayOffLog();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleUpdateTask = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to update tasks.");
      return;
    }

    if (editedDescription.trim() === "") {
      toast.error("Task description cannot be empty.");
      return;
    }

    const updatedTask: Task = {
      ...task,
      description: editedDescription,
      notes: editedNotes,
      due_date: editedDueDate ? editedDueDate.toISOString() : null,
      remind_at: editedRemindAt ? editedRemindAt.toISOString() : null,
      category: editedCategory || null,
      priority: editedPriority,
      section_id: editedSectionId || null,
      recurring_type: editedRecurringType,
    };

    const { error } = await supabase
      .from("tasks")
      .update(updatedTask)
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update task: " + error.message);
    } else {
      onTaskUpdate(updatedTask);
      setIsEditing(false);
      toast.success("Task updated!");
    }
  };

  const handleDeleteTask = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to delete tasks.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to delete task: " + error.message);
    } else {
      onTaskDelete(task.id);
      toast.success("Task deleted!");
    }
  };

  const handleToggleComplete = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to update tasks.");
      return;
    }

    const newStatus = task.status === "completed" ? "to-do" : "completed";
    const updatedTask: Task = { ...task, status: newStatus };

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update task status: " + error.message);
    } else {
      onTaskUpdate(updatedTask);
      toast.success(`Task marked as ${newStatus}!`);
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      case "none":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryColor = (categoryId: string | null) => {
    const category = categories?.find((cat) => cat.id === categoryId);
    return category?.color || "gray";
  };

  const handleMoveToToday = async () => {
    if (!user?.id) return;

    const todaySection = allSections.find(
      (section) => section.name === "Today's Priorities" && section.user_id === user.id
    );

    if (!todaySection) {
      toast.error("Today's Priorities section not found.");
      return;
    }

    const isAlreadyOffToday = doTodayOffLog?.some(
      (entry) => entry.task_id === task.id && isToday(parseISO(entry.off_date))
    );

    if (isAlreadyOffToday) {
      toast.error("This task was already moved off 'Today's Priorities' today.");
      return;
    }

    onMoveTaskToToday(task);
    toast.success("Task moved to Today's Priorities!");
  };

  const handleMoveOffToday = async () => {
    if (!user?.id) return;

    const todaySection = allSections.find(
      (section) => section.name === "Today's Priorities" && section.user_id === user.id
    );

    if (!todaySection || task.section_id !== todaySection.id) {
      toast.error("Task is not in 'Today's Priorities' to move off.");
      return;
    }

    const { error } = await supabase.from("do_today_off_log").insert({
      user_id: user.id,
      task_id: task.id,
      off_date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      toast.error("Failed to log 'move off today': " + error.message);
      return;
    }

    await refetchDoTodayOffLog(); // Refresh the off log
    onMoveTaskToSection(task.id, null); // Move to no section
    toast.success("Task moved off Today's Priorities!");
  };

  const handleMoveToTomorrow = () => {
    onMoveTaskToTomorrow(task);
    toast.success("Task moved to Tomorrow!");
  };

  const handleMoveToThisWeek = () => {
    onMoveTaskToThisWeek(task);
    toast.success("Task moved to This Week!");
  };

  const handleMoveToFuture = () => {
    onMoveTaskToFuture(task);
    toast.success("Task moved to Future!");
  };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "completed";
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));
  const isDueTomorrow = task.due_date && isTomorrow(parseISO(task.due_date));
  const isDueThisWeek =
    task.due_date && isThisWeek(parseISO(task.due_date), { weekStartsOn: 1 }) && !isDueToday && !isDueTomorrow;

  const todaySection = allSections.find(
    (section) => section.name === "Today's Priorities" && section.user_id === user?.id
  );

  const isTaskOffToday = doTodayOffLog?.some(
    (entry) => entry.task_id === task.id && isToday(parseISO(entry.off_date))
  );

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      // Removed dragHandleProps from main container
      className={cn(
        "flex flex-col p-3 rounded-lg shadow-sm mb-2 border",
        isDragging ? "bg-blue-100 border-blue-400" : "bg-white border-gray-200",
        task.status === "completed" && "opacity-70 line-through text-gray-500",
        isSubtask && "ml-6 bg-gray-50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-grow min-w-0">
          <Checkbox
            checked={task.status === "completed"}
            onCheckedChange={handleToggleComplete}
            className="mr-3"
            id={`task-${task.id}`}
            onClick={(e) => e.stopPropagation()}
          />
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleUpdateTask}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditedDescription(task.description);
                }
              }}
              className="flex-grow min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <label
              htmlFor={`task-${task.id}`}
              className="flex-grow text-sm cursor-pointer truncate"
              onDoubleClick={() => setIsEditing(true)}
              {...provided.dragHandleProps} // Added dragHandleProps to the label
            >
              {task.description}
            </label>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-2">
          {task.priority !== "none" && (
            <Badge
              className={cn(
                "text-white px-2 py-0.5 text-xs",
                getPriorityColor(task.priority)
              )}
            >
              {task.priority}
            </Badge>
          )}

          {task.category && (
            <Badge
              className={cn(
                "text-white px-2 py-0.5 text-xs",
                `bg-${getCategoryColor(task.category)}-500`
              )}
            >
              {categories?.find((cat) => cat.id === task.category)?.name || "Category"}
            </Badge>
          )}

          {isOverdue && (
            <Badge variant="destructive" className="px-2 py-0.5 text-xs">
              Overdue
            </Badge>
          )}
          {isDueToday && !isOverdue && (
            <Badge className="bg-blue-500 text-white px-2 py-0.5 text-xs">
              Today
            </Badge>
          )}
          {isDueTomorrow && (
            <Badge className="bg-indigo-500 text-white px-2 py-0.5 text-xs">
              Tomorrow
            </Badge>
          )}
          {isDueThisWeek && (
            <Badge className="bg-purple-500 text-white px-2 py-0.5 text-xs">
              This Week
            </Badge>
          )}

          <DropdownMenu open={showMoreOptions} onOpenChange={setShowMoreOptions}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Task Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTask(task.id)}>
                <Plus className="mr-2 h-4 w-4" /> Add Subtask
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Move to Section */}
              <DropdownMenuLabel>Move to Section</DropdownMenuLabel>
              {allSections.map((section) => (
                <DropdownMenuItem
                  key={section.id}
                  onClick={() => onMoveTaskToSection(task.id, section.id)}
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> {section.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => onMoveTaskToSection(task.id, null)}>
                <X className="mr-2 h-4 w-4" /> No Section
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Quick Move Options */}
              <DropdownMenuLabel>Quick Move</DropdownMenuLabel>
              {task.section_id !== todaySection?.id && (
                <DropdownMenuItem onClick={handleMoveToToday}>
                  <Calendar className="mr-2 h-4 w-4" /> Move to Today
                </DropdownMenuItem>
              )}
              {task.section_id === todaySection?.id && !isTaskOffToday && (
                <DropdownMenuItem onClick={handleMoveOffToday}>
                  <MinusCircle className="mr-2 h-4 w-4" /> Move Off Today
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleMoveToTomorrow}>
                <Calendar className="mr-2 h-4 w-4" /> Move to Tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMoveToThisWeek}>
                <Calendar className="mr-2 h-4 w-4" /> Move to This Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMoveToFuture}>
                <Calendar className="mr-2 h-4 w-4" /> Move to Future
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowDeleteDialog(true);
                    }}
                    className="text-red-600 focus:bg-red-100"
                  >
                    <Trash className="mr-2 h-4 w-4" /> Delete Task
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your task
                      and any associated subtasks.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask();
                      }}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Notes */}
          <div>
            <label htmlFor={`notes-${task.id}`} className="sr-only">Notes</label>
            <Textarea
              id={`notes-${task.id}`}
              placeholder="Add notes..."
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              onBlur={handleUpdateTask}
              className="text-sm"
            />
          </div>

          {/* Due Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !editedDueDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {editedDueDate ? format(editedDueDate, "PPP") : <span>Pick a due date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <ShadcnCalendar
                mode="single"
                selected={editedDueDate}
                onSelect={(date) => {
                  setEditedDueDate(date);
                }}
                initialFocus
              />
              {editedDueDate && (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditedDueDate(undefined);
                    }}
                    className="w-full"
                  >
                    Clear Due Date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Remind At */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !editedRemindAt && "text-muted-foreground"
                )}
              >
                <Clock className="mr-2 h-4 w-4" />
                {editedRemindAt ? format(editedRemindAt, "PPP HH:mm") : <span>Set a reminder</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <ShadcnCalendar
                mode="single"
                selected={editedRemindAt}
                onSelect={(date) => {
                  setEditedRemindAt(date);
                }}
                initialFocus
              />
              {editedRemindAt && (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditedRemindAt(undefined);
                    }}
                    className="w-full"
                  >
                    Clear Reminder
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Category */}
          <Select
            value={editedCategory || ""}
            onValueChange={(value) => setEditedCategory(value === "" ? null : value)}
          >
            <SelectTrigger className="w-full">
              <Tag className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Category</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={editedPriority} onValueChange={(value: Task["priority"]) => setEditedPriority(value)}>
            <SelectTrigger className="w-full">
              <AlertCircle className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Set priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Section */}
          <Select
            value={editedSectionId || ""}
            onValueChange={(value) => setEditedSectionId(value === "" ? null : value)}
          >
            <SelectTrigger className="w-full">
              <List className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Section</SelectItem>
              {sections?.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Recurring Type */}
          <Select
            value={editedRecurringType || "none"}
            onValueChange={(value) =>
              setEditedRecurringType(value as Task["recurring_type"])
            }
          >
            <SelectTrigger className="w-full">
              <Repeat className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Set recurrence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {/* Link */}
          {task.link && (
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-4 w-4 text-gray-500" />
              <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">
                {task.link}
              </a>
            </div>
          )}

          {/* Image */}
          {task.image_url && (
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-4 w-4 text-gray-500" />
              <img src={task.image_url} alt="Task image" className="max-h-24 rounded-md" />
            </div>
          )}

          <Button onClick={handleUpdateTask} className="w-full">
            Save Changes
          </Button>
        </div>
      )}

      {subtasks.length > 0 && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleSubtasks && onToggleSubtasks(task.id)}
            className="w-full justify-start text-sm text-gray-600 hover:text-gray-800"
            onClickCapture={(e) => e.stopPropagation()}
          >
            {showSubtasks ? (
              <ChevronUp className="mr-2 h-4 w-4" />
            ) : (
              <ChevronDown className="mr-2 h-4 w-4" />
            )}
            {subtasks.length} Subtask{subtasks.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;