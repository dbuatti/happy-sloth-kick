"use client";

import { useState, useRef, useEffect } from "react";
import { Draggable, DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Tag,
  ArrowRight,
  Repeat,
  Link,
  Image,
  Star,
  Flag,
  MessageSquare,
  Plus,
  Minus,
  EyeOff,
} from "lucide-react";
import { Task, TaskCategory, TaskSection, DoTodayOffLogEntry } from "@/types";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { useTaskSections } from "@/hooks/useTaskSections";
import { useDoTodayOffLog } from "@/hooks/useDoTodayOffLog";
import { useUserSettings } from "@/hooks/useUserSettings";

export interface TaskCardProps { // Exported interface
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, status: "to-do" | "completed") => void;
  onToggleFocus: (id: string, isFocused: boolean) => void;
  focusedTaskId: string | null;
  allTasks: Task[];
  isDragging: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  onEdit,
  onDelete,
  onToggleComplete,
  onToggleFocus,
  focusedTaskId,
  allTasks,
  isDragging,
}) => {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const user = useUser();
  const { data: categories } = useTaskCategories();
  const { data: sections } = useTaskSections();
  const { data: doTodayOffLog, refetch: refetchDoTodayOffLog } = useDoTodayOffLog();
  const { settings: userSettings } = useUserSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedNotes, setEditedNotes] = useState(task.notes || "");
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    task.due_date ? parseISO(task.due_date as string) : undefined
  );
  const [editedRemindAt, setEditedRemindAt] = useState<Date | undefined>(
    task.remind_at ? parseISO(task.remind_at as string) : undefined
  );
  const [editedCategory, setEditedCategory] = useState<string | undefined>(
    task.category || undefined
  );
  const [editedPriority, setEditedPriority] = useState<Task["priority"]>(
    task.priority || "medium"
  );
  const [editedSectionId, setEditedSectionId] = useState<string | undefined>(
    task.section_id || undefined
  );
  const [editedRecurringType, setEditedRecurringType] = useState<
    Task["recurring_type"]
  >(task.recurring_type || "none");
  const [editedLink, setEditedLink] = useState(task.link || "");
  const [editedImageUrl, setEditedImageUrl] = useState(task.image_url || "");
  const [showSubtasks, setShowSubtasks] = useState(true);

  const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
  const hasSubtasks = subtasks.length > 0;
  const completedSubtasksCount = subtasks.filter(
    (t) => t.status === "completed"
  ).length;

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isEditing]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task>) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updatedTask)
        .eq("id", task.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
      toast.success("Task updated successfully!");
      onEdit(data);
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to update task.");
      console.error("Error updating task:", error);
    },
  });

  const handleSave = () => {
    if (!editedDescription.trim()) {
      toast.error("Task description cannot be empty.");
      return;
    }

    const updatedTask: Partial<Task> = {
      description: editedDescription,
      notes: editedNotes,
      due_date: editedDueDate ? editedDueDate.toISOString() : null,
      remind_at: editedRemindAt ? editedRemindAt.toISOString() : null,
      category: editedCategory || null,
      priority: editedPriority,
      section_id: editedSectionId || null,
      recurring_type: editedRecurringType,
      link: editedLink,
      image_url: editedImageUrl,
    };
    updateTaskMutation.mutate(updatedTask);
  };

  const handleToggleComplete = async () => {
    const newStatus = task.status === "to-do" ? "completed" : "to-do";
    onToggleComplete(task.id, newStatus);

    // If it's a recurring task and being completed, create a new instance
    if (newStatus === "completed" && task.recurring_type !== "none") {
      const nextDueDate = getNextRecurringDate(task);
      if (nextDueDate) {
        const { error } = await supabase.from("tasks").insert({
          user_id: user?.id,
          description: task.description,
          status: "to-do",
          category: task.category,
          priority: task.priority,
          section_id: task.section_id,
          recurring_type: task.recurring_type,
          original_task_id: task.original_task_id || task.id,
          due_date: nextDueDate.toISOString(),
          notes: task.notes,
          link: task.link,
          image_url: task.image_url,
        });
        if (error) {
          console.error("Error creating next recurring task:", error);
          toast.error("Failed to create next recurring task.");
        } else {
          toast.success("Next recurring task created!");
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
      }
    }
  };

  const getNextRecurringDate = (currentTask: Task): Date | null => {
    const now = new Date();
    let nextDate = new Date(currentTask.due_date || now);

    switch (currentTask.recurring_type) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return null;
    }

    // Ensure the next date is in the future if the original due date was in the past
    while (nextDate <= now) {
      switch (currentTask.recurring_type) {
        case "daily":
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }

    return nextDate;
  };

  const formattedDueDate = task.due_date
    ? parseISO(task.due_date as string)
    : null;
  const isOverdue = formattedDueDate && isPast(formattedDueDate) && !isToday(formattedDueDate) && task.status === "to-do";

  const getDueDateText = (date: Date | null) => {
    if (!date) return null;
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM dd");
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
      default:
        return "bg-gray-500";
    }
  };

  const category = categories?.find((cat: TaskCategory) => cat.id === task.category);

  const handleMoveToToday = async () => {
    if (!user?.id) return;

    const todaySection = sections?.find(
      (s: TaskSection) => s.user_id === user.id && s.name === "Today's Priorities"
    );

    if (!todaySection) {
      toast.error("Today's Priorities section not found.");
      return;
    }

    // Check if the task is already in "Today's Priorities"
    if (task.section_id === todaySection.id) {
      toast("Task is already in Today's Priorities.");
      return;
    }

    // Check if the task is in the do_today_off_log for today
    const isOffToday = doTodayOffLog?.some(
      (log: DoTodayOffLogEntry) =>
        log.task_id === task.id &&
        new Date(log.off_date).toDateString() === new Date().toDateString()
    );

    if (isOffToday) {
      toast.info("This task was previously moved off 'Today' for today.");
      // Optionally, ask if they want to override and move it back
      // For now, we'll just prevent it.
      return;
    }

    updateTaskMutation.mutate({
      section_id: todaySection.id,
      due_date: new Date().toISOString(),
    });
  };

  const handleMoveOffToday = async () => {
    if (!user?.id) return;

    const todaySection = sections?.find(
      (s: TaskSection) => s.user_id === user.id && s.name === "Today's Priorities"
    );

    if (!todaySection || task.section_id !== todaySection.id) {
      toast.info("Task is not in Today's Priorities.");
      return;
    }

    // Add to do_today_off_log
    const { error: logError } = await supabase.from("do_today_off_log").insert({
      user_id: user.id,
      task_id: task.id,
      off_date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    });

    if (logError) {
      console.error("Error logging 'move off today':", logError);
      toast.error("Failed to log 'move off today'.");
      return;
    }

    // Move to 'This Week' section if it exists, otherwise null
    const thisWeekSection = sections?.find(
      (s: TaskSection) => s.user_id === user.id && s.name === "This Week"
    );

    updateTaskMutation.mutate({
      section_id: thisWeekSection?.id || null,
      due_date: null, // Clear due date when moving off today
    });
    refetchDoTodayOffLog(); // Refresh the log
  };

  const handleToggleSubtasksVisibility = () => {
    setShowSubtasks((prev) => !prev);
  };

  const isFocusedTask = focusedTaskId === task.id;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "relative flex items-center justify-between rounded-md border bg-card text-card-foreground shadow-sm p-3 mb-2",
            task.status === "completed" && "opacity-70 line-through",
            isOverdue && task.status === "to-do" && "border-red-500",
            isFocusedTask && "ring-2 ring-blue-500 ring-offset-2",
            snapshot.isDragging && "shadow-lg bg-blue-100 dark:bg-blue-900",
            isDragging && "shadow-lg bg-blue-100 dark:bg-blue-900" // Apply consistent dragging style
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <div className="flex items-center flex-grow min-w-0">
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={handleToggleComplete}
              className="mr-3"
              data-dnd-kit-skip-click={true}
            />
            <div className="flex-grow min-w-0">
              <p className="text-sm font-medium break-words pr-2">
                {task.description}
              </p>
              {(formattedDueDate || category || task.priority !== "medium") && (
                <div className="flex items-center flex-wrap gap-1 mt-1 text-xs text-muted-foreground">
                  {formattedDueDate && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1 py-0.5 font-normal",
                        isOverdue && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      )}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {getDueDateText(formattedDueDate)}
                    </Badge>
                  )}
                  {category && (
                    <Badge
                      variant="outline"
                      className="px-1 py-0.5 font-normal"
                      style={{
                        backgroundColor: category.color || "gray",
                        color: "white",
                      }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {category.name}
                    </Badge>
                  )}
                  {task.priority && task.priority !== "none" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1 py-0.5 font-normal capitalize",
                        getPriorityColor(task.priority)
                      )}
                    >
                      <Flag className="h-3 w-3 mr-1" />
                      {task.priority}
                    </Badge>
                  )}
                  {task.recurring_type !== "none" && (
                    <Badge variant="outline" className="px-1 py-0.5 font-normal capitalize">
                      <Repeat className="h-3 w-3 mr-1" />
                      {task.recurring_type}
                    </Badge>
                  )}
                  {task.link && (
                    <a
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center"
                      onClick={(e) => e.stopPropagation()} // Prevent drag from starting
                    >
                      <Link className="h-3 w-3 mr-1" />
                      Link
                    </a>
                  )}
                  {task.image_url && (
                    <span className="flex items-center text-muted-foreground">
                      <Image className="h-3 w-3 mr-1" />
                      Image
                    </span>
                  )}
                  {task.notes && (
                    <span className="flex items-center text-muted-foreground">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Notes
                    </span>
                  )}
                </div>
              )}
              {hasSubtasks && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleSubtasksVisibility}
                    className="h-6 px-2 text-xs text-muted-foreground"
                    data-dnd-kit-skip-click={true}
                  >
                    {showSubtasks ? (
                      <Minus className="h-3 w-3 mr-1" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    {completedSubtasksCount}/{subtasks.length} Subtasks
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 data-[state=open]:bg-muted"
                data-dnd-kit-skip-click={true}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Task Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault(); // Prevent dropdown from closing immediately
                      setIsEditing(true);
                      setEditedDescription(task.description);
                      setEditedNotes(task.notes || "");
                      setEditedDueDate(
                        task.due_date ? parseISO(task.due_date as string) : undefined
                      );
                      setEditedRemindAt(
                        task.remind_at ? parseISO(task.remind_at as string) : undefined
                      );
                      setEditedCategory(task.category || undefined);
                      setEditedPriority(task.priority || "medium");
                      setEditedSectionId(task.section_id || undefined);
                      setEditedRecurringType(task.recurring_type || "none");
                      setEditedLink(task.link || "");
                      setEditedImageUrl(task.image_url || "");
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]" ref={cardRef}>
                  <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>
                      Make changes to your task here. Click save when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description
                      </Label>
                      <Input
                        id="description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="notes" className="text-right">
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="dueDate" className="text-right">
                        Due Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "col-span-3 justify-start text-left font-normal",
                              !editedDueDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {editedDueDate ? (
                              format(editedDueDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={editedDueDate}
                            onSelect={setEditedDueDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="remindAt" className="text-right">
                        Remind At
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "col-span-3 justify-start text-left font-normal",
                              !editedRemindAt && "text-muted-foreground"
                            )}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {editedRemindAt ? (
                              format(editedRemindAt, "PPP HH:mm")
                            ) : (
                              <span>Pick a date & time</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={editedRemindAt}
                            onSelect={setEditedRemindAt}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={editedRemindAt ? format(editedRemindAt, "HH:mm") : ""}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(":");
                                const newDate = editedRemindAt || new Date();
                                newDate.setHours(parseInt(hours));
                                newDate.setMinutes(parseInt(minutes));
                                setEditedRemindAt(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category" className="text-right">
                        Category
                      </Label>
                      <Select
                        value={editedCategory}
                        onValueChange={setEditedCategory}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat: TaskCategory) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span
                                className="inline-block w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: cat.color || "gray" }}
                              ></span>
                              {cat.name}
                            </SelectItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()} // Keep dialog open
                            className="text-blue-600"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Manage Categories
                          </DropdownMenuItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="priority" className="text-right">
                        Priority
                      </Label>
                      <Select
                        value={editedPriority}
                        onValueChange={(value: Task["priority"]) =>
                          setEditedPriority(value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="section" className="text-right">
                        Section
                      </Label>
                      <Select
                        value={editedSectionId}
                        onValueChange={setEditedSectionId}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections?.map((sec: TaskSection) => (
                            <SelectItem key={sec.id} value={sec.id}>
                              {sec.name}
                            </SelectItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()} // Keep dialog open
                            className="text-blue-600"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Manage Sections
                          </DropdownMenuItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="recurring" className="text-right">
                        Recurring
                      </Label>
                      <Select
                        value={editedRecurringType}
                        onValueChange={(value: Task["recurring_type"]) =>
                          setEditedRecurringType(value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="link" className="text-right">
                        Link
                      </Label>
                      <Input
                        id="link"
                        value={editedLink}
                        onChange={(e) => setEditedLink(e.target.value)}
                        className="col-span-3"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="imageUrl" className="text-right">
                        Image URL
                      </Label>
                      <Input
                        id="imageUrl"
                        value={editedImageUrl}
                        onChange={(e) => setEditedImageUrl(e.target.value)}
                        className="col-span-3"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSave}>
                      Save changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenuItem onSelect={handleMoveToToday}>
                <ArrowRight className="mr-2 h-4 w-4" /> Move to Today
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleMoveOffToday}>
                <EyeOff className="mr-2 h-4 w-4" /> Move off Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFocus(task.id, !isFocusedTask)}>
                {isFocusedTask ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Star className="mr-2 h-4 w-4" />
                )}
                {isFocusedTask ? "Unfocus Task" : "Focus on Task"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()} // Prevent dropdown from closing
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your task and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(task.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;