"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Task, TaskCategory, TaskSection } from "@/types";
import TaskItem from "@/components/tasks/TaskItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Changed from TouchFriendlyButton
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [doTodayLog, setDoTodayLog] = useState<Set<string>>(new Set()); // Changed to Set<string>

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("order", { ascending: true });

    if (error) {
      toast.error("Failed to fetch tasks.");
      console.error("Error fetching tasks:", error);
    } else {
      setTasks(data || []);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from("task_categories").select("*");
    if (error) {
      toast.error("Failed to fetch categories.");
      console.error("Error fetching categories:", error);
    } else {
      setCategories(data || []);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    const { data, error } = await supabase.from("task_sections").select("*").order("order", { ascending: true });
    if (error) {
      toast.error("Failed to fetch sections.");
      console.error("Error fetching sections:", error);
    } else {
      setSections(data || []);
    }
  }, []);

  const fetchDoTodayLog = useCallback(async () => {
    const { data, error } = await supabase.from("do_today_off_log").select("task_id");
    if (error) {
      toast.error("Failed to fetch 'Do Today' log.");
      console.error("Error fetching 'Do Today' log:", error);
    } else {
      setDoTodayLog(new Set(data?.map(item => item.task_id) || [])); // Convert to Set
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchSections();
    fetchDoTodayLog();
  }, [fetchTasks, fetchCategories, fetchSections, fetchDoTodayLog]);

  const handleAddTask = async (parentId: string | null = null) => {
    if (!newTaskDescription.trim()) {
      toast.error("Task description cannot be empty.");
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("You must be logged in to add tasks.");
      return;
    }

    const newTask: Omit<Task, "id" | "created_at" | "updated_at"> = {
      description: newTaskDescription,
      status: "to-do",
      user_id: user.user.id,
      priority: "medium",
      order: tasks.length,
      parent_task_id: parentId,
      recurring_type: "none",
      due_date: null,
      notes: null,
      remind_at: null,
      section_id: null,
      original_task_id: null,
      category: null,
      link: null,
      image_url: null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(newTask)
      .select()
      .single();

    if (error) {
      toast.error("Failed to add task.");
      console.error("Error adding task:", error);
    } else if (data) {
      setTasks((prevTasks) => [...prevTasks, data]);
      setNewTaskDescription("");
      toast.success("Task added successfully!");
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    setDoTodayLog((prevLog) => {
      const newLog = new Set(prevLog);
      newLog.delete(taskId);
      return newLog;
    });
  };

  const handleToggleDoToday = async (taskId: string, doToday: boolean) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("You must be logged in to update tasks.");
      return;
    }

    if (doToday) {
      // If doToday is true, it means the user wants to mark it as "Do Today".
      // So, we should REMOVE it from the do_today_off_log.
      const { error } = await supabase
        .from("do_today_off_log")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", user.user.id);
      if (error) {
        toast.error("Failed to mark task as 'Do Today'.");
        console.error("Error marking task as 'Do Today':", error);
      } else {
        setDoTodayLog((prevLog) => {
          const newLog = new Set(prevLog);
          newLog.delete(taskId);
          return newLog;
        });
        toast.success("Task marked as 'Do Today'!");
      }
    } else {
      // If doToday is false, it means the user wants to mark it as NOT "Do Today".
      // So, we should ADD it to the do_today_off_log.
      const { error } = await supabase
        .from("do_today_off_log")
        .insert({ task_id: taskId, user_id: user.user.id, off_date: new Date().toISOString().split('T')[0] });
      if (error) {
        toast.error("Failed to unmark task from 'Do Today'.");
        console.error("Error unmarking task from 'Do Today':", error);
      } else {
        setDoTodayLog((prevLog) => {
          const newLog = new Set(prevLog);
          newLog.add(taskId);
          return newLog;
        });
        toast.success("Task unmarked from 'Do Today'.");
      }
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over?.id);
      const newOrder = arrayMove(tasks, oldIndex, newIndex);

      setTasks(newOrder);

      // Update order in database
      const updates = newOrder.map((task, index) => ({
        id: task.id,
        order: index,
        parent_task_id: task.parent_task_id, // Preserve parent_task_id
        section_id: task.section_id, // Preserve section_id
      }));

      const { error } = await supabase.rpc("update_tasks_order", { updates });

      if (error) {
        toast.error("Failed to update task order.");
        console.error("Error updating task order:", error);
        // Optionally revert state if update fails
        fetchTasks();
      } else {
        toast.success("Task order updated!");
      }
    }
  };

  const getTasksForSection = (sectionId: string | null) => {
    return tasks
      .filter((task) => task.section_id === sectionId && !task.parent_task_id)
      .sort((a, b) => a.order - b.order);
  };

  const getSubtasks = (parentId: string) => {
    return tasks
      .filter((task) => task.parent_task_id === parentId)
      .sort((a, b) => a.order - b.order);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">My Tasks</h1>

      <div className="flex mb-6 space-x-2">
        <Input
          placeholder="Add a new task..."
          value={newTaskDescription}
          onChange={(e) => setNewTaskDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddTask();
            }
          }}
          className="flex-grow"
        />
        <Button onClick={() => handleAddTask()}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        {sections.map((section) => (
          <div key={section.id} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              {section.name}
              {section.include_in_focus_mode && (
                <span className="ml-2 text-sm text-muted-foreground">(Focus Mode)</span>
              )}
            </h2>
            <SortableContext
              items={getTasksForSection(section.id).map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {getTasksForSection(section.id).map((task) => (
                <React.Fragment key={task.id}>
                  <TaskItem
                    task={task}
                    categories={categories}
                    sections={sections}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                    onAddTask={handleAddTask}
                    subtasks={getSubtasks(task.id)}
                    onToggleDoToday={handleToggleDoToday}
                    doTodayLog={doTodayLog}
                  />
                </React.Fragment>
              ))}
            </SortableContext>
          </div>
        ))}

        {/* Tasks without a section */}
        {getTasksForSection(null).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Uncategorized Tasks</h2>
            <SortableContext
              items={getTasksForSection(null).map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {getTasksForSection(null).map((task) => (
                <React.Fragment key={task.id}>
                  <TaskItem
                    task={task}
                    categories={categories}
                    sections={sections}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                    onAddTask={handleAddTask}
                    subtasks={getSubtasks(task.id)}
                    onToggleDoToday={handleToggleDoToday}
                    doTodayLog={doTodayLog}
                  />
                </React.Fragment>
              ))}
            </SortableContext>
          </div>
        )}
      </DndContext>
    </div>
  );
}