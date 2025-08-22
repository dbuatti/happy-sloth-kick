import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { TaskCategory } from "@/types";

export const useTaskCategories = () => {
  const supabase = useSupabaseClient();
  const user = useUser();

  return useQuery<TaskCategory[], Error>({
    queryKey: ["task_categories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("task_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};