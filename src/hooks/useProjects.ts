import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";

interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_count: number;
  created_at: string;
  link: string | null;
  notes: string | null;
}

interface UseProjectsProps {
  userId?: string;
}

export const useProjects = (props?: UseProjectsProps) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const { settings, updateSetting } = useSettings(); // Renamed updateSettings to updateSetting
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ["projects", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const addProject = async (newProject: Omit<Project, "id" | "user_id" | "created_at" | "current_count">) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...newProject, user_id: userId, current_count: 0 })
      .select()
      .single();
    if (error) {
      toast.error("Failed to add project: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["projects", userId] });
      toast.success("Project added successfully!");
    }
    return data;
  };

  const updateProject = async (id: string, updatedFields: Partial<Omit<Project, "id" | "user_id" | "created_at">>) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .update(updatedFields)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) {
      toast.error("Failed to update project: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["projects", userId] });
      toast.success("Project updated successfully!");
    }
    return data;
  };

  const deleteProject = async (id: string) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to delete project: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["projects", userId] });
      toast.success("Project deleted successfully!");
    }
  };

  return {
    projects,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    settings,
    updateSetting,
  };
};