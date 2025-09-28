import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useReminders } from "@/context/ReminderContext";
import { useSettings } from "@/context/SettingsContext";
import { useCallback } from "react";

export interface Task {
  id: string;
  description: string;
  status: "to-do" | "in-progress" | "completed" | "archived";
  created_at: string;
  user_id: string;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  updated_at: string;
  completed_at: string | null;
  subtasks?: Task[];
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number;
  created_at: string;
  include_in_focus_mode: boolean;
  tasks?: Task[];
}

interface UseTasksProps {
  userId?: string;
  sectionId?: string | null;
  status?: "to-do" | "in-progress" | "completed" | "archived";
  includeSubtasks?: boolean;
  includeSections?: boolean;
  filterByDueDate?: boolean;
  filterByPriority?: "low" | "medium" | "high" | "urgent" | null;
  filterByCategoryId?: string | null;
  filterBySearchTerm?: string | null;
}

export const useTasks = (props?: UseTasksProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = props?.userId ?? user?.id ?? undefined;
  const { settings: userSettings, updateSetting } = useSettings(); // Renamed updateSettings to updateSetting
  const { scheduleReminder, cancelReminder } = useReminders();

  const fetchTasks = useCallback(async () => {
    if (!userId) return [];

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId);

    if (props?.sectionId !== undefined) {
      query = query.eq("section_id", props.sectionId);
    }
    if (props?.status) {
      query = query.eq("status", props.status);
    }
    if (props?.filterByPriority) {
      query = query.eq("priority", props.filterByPriority);
    }
    if (props?.filterByCategoryId) {
      query = query.eq("category", props.filterByCategoryId);
    }
    if (props?.filterBySearchTerm) {
      query = query.ilike("description", `%${props.filterBySearchTerm}%`);
    }

    query = query.order("order", { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    const tasks: Task[] = data || [];

    if (props?.includeSubtasks) {
      const parentTasks = tasks.filter((task) => !task.parent_task_id);
      const subtasks = tasks.filter((task) => task.parent_task_id);

      return parentTasks.map((parentTask) => ({
        ...parentTask,
        subtasks: subtasks.filter((subtask) => subtask.parent_task_id === parentTask.id),
      }));
    }

    return tasks;
  }, [userId, props?.sectionId, props?.status, props?.filterByPriority, props?.filterByCategoryId, props?.filterBySearchTerm, props?.includeSubtasks]);

  const fetchSectionsWithTasks = useCallback(async () => {
    if (!userId) return [];

    const { data, error } = await supabase.rpc("get_user_tasks_with_sections");

    if (error) throw error;

    const sectionsMap = new Map<string, TaskSection>();

    data.forEach((row: any) => {
      if (!sectionsMap.has(row.section_id)) {
        sectionsMap.set(row.section_id, {
          id: row.section_id,
          name: row.section_name,
          order: row.section_order,
          include_in_focus_mode: row.section_include_in_focus_mode,
          created_at: row.section_created_at,
          user_id: userId,
          tasks: [],
        });
      }

      if (row.task_id) {
        const task: Task = {
          id: row.task_id,
          description: row.task_description,
          status: row.task_status,
          created_at: row.task_created_at,
          user_id: userId,
          priority: row.task_priority,
          due_date: row.task_due_date,
          notes: row.task_notes,
          remind_at: row.task_remind_at,
          section_id: row.task_section_id,
          order: row.task_order,
          parent_task_id: row.task_parent_task_id,
          recurring_type: row.task_recurring_type,
          original_task_id: row.task_original_task_id,
          category: row.task_category,
          link: row.task_link,
          image_url: row.task_image_url,
          updated_at: row.task_updated_at,
          completed_at: row.task_completed_at,
        };
        sectionsMap.get(row.section_id)?.tasks?.push(task);
      }
    });

    const sections = Array.from(sectionsMap.values());

    // Organize subtasks
    sections.forEach(section => {
      if (section.tasks) {
        const parentTasks = section.tasks.filter(task => !task.parent_task_id);
        const subtasks = section.tasks.filter(task => task.parent_task_id);

        section.tasks = parentTasks.map(parentTask => ({
          ...parentTask,
          subtasks: subtasks.filter(subtask => subtask.parent_task_id === parentTask.id)
        }));
      }
    });

    return sections;
  }, [userId]);

  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[], Error>({
    queryKey: ["tasks", userId, props?.sectionId, props?.status, props?.filterByPriority, props?.filterByCategoryId, props?.filterBySearchTerm, props?.includeSubtasks],
    queryFn: fetchTasks,
    enabled: !!userId && !props?.includeSections,
  });

  const { data: sections, isLoading: isLoadingSections, error: sectionsError } = useQuery<TaskSection[], Error>({
    queryKey: ["sectionsWithTasks", userId],
    queryFn: fetchSectionsWithTasks,
    enabled: !!userId && props?.includeSections,
  });

  const addTask = async (newTask: Omit<Task, "id" | "user_id" | "created_at" | "updated_at" | "order" | "status"> & { status?: Task["status"] }) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...newTask, user_id: userId, status: newTask.status || "to-do" })
      .select()
      .single();
    if (error) {
      toast.error("Failed to add task: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      toast.success("Task added successfully!");
      if (data?.remind_at) {
        scheduleReminder(data.id, data.description, new Date(data.remind_at));
      }
    }
    return data;
  };

  const updateTask = async (id: string, updatedFields: Partial<Omit<Task, "id" | "user_id" | "created_at">>) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }

    // Handle status change to completed
    if (updatedFields.status === "completed" && !updatedFields.completed_at) {
      updatedFields.completed_at = new Date().toISOString();
    } else if (updatedFields.status !== "completed" && updatedFields.completed_at) {
      updatedFields.completed_at = null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updatedFields)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) {
      toast.error("Failed to update task: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      toast.success("Task updated successfully!");
      if (data?.remind_at) {
        scheduleReminder(data.id, data.description, new Date(data.remind_at));
      } else {
        cancelReminder(data?.id);
      }
    }
    return data;
  };

  const deleteTask = async (id: string) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to delete task: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      toast.success("Task deleted successfully!");
      cancelReminder(id);
    }
  };

  const addSection = async (newSection: Omit<TaskSection, "id" | "user_id" | "created_at" | "order"> & { order?: number }) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("task_sections")
      .insert({ ...newSection, user_id: userId })
      .select()
      .single();
    if (error) {
      toast.error("Failed to add section: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      toast.success("Section added successfully!");
    }
    return data;
  };

  const updateSection = async (id: string, updatedFields: Partial<Omit<TaskSection, "id" | "user_id" | "created_at">>) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("task_sections")
      .update(updatedFields)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) {
      toast.error("Failed to update section: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      toast.success("Section updated successfully!");
    }
    return data;
  };

  const deleteSection = async (id: string) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { error } = await supabase
      .from("task_sections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to delete section: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] }); // Invalidate tasks as well
      toast.success("Section deleted successfully!");
    }
  };

  const updateTaskOrder = async (updates: { id: string; order: number; section_id: string | null; parent_task_id: string | null }[]) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { error } = await supabase.rpc("update_tasks_order", { updates });
    if (error) {
      toast.error("Failed to update task order: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      toast.success("Task order updated successfully!");
    }
  };

  const updateSectionOrder = async (updates: { id: string; order: number; name: string; include_in_focus_mode: boolean }[]) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { error } = await supabase.rpc("update_sections_order", { updates });
    if (error) {
      toast.error("Failed to update section order: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["sectionsWithTasks", userId] });
      toast.success("Section order updated successfully!");
    }
  };

  return {
    tasks,
    isLoadingTasks,
    tasksError,
    sections,
    isLoadingSections,
    sectionsError,
    addTask,
    updateTask,
    deleteTask,
    addSection,
    updateSection,
    deleteSection,
    updateTaskOrder,
    updateSectionOrder,
    userSettings,
    updateSetting,
  };
};