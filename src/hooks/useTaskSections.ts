import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { TaskSection } from "@/types";

export const useTaskSections = () => {
  const supabase = useSupabaseClient();
  const user = useUser();

  return useQuery<TaskSection[], Error>({
    queryKey: ["task_sections", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("task_sections")
        .select("*")
        .eq("user_id", user.id)
        .order("order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};