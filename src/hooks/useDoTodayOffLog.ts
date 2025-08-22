import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { DoTodayOffLogEntry } from "@/types";

export const useDoTodayOffLog = () => {
  const supabase = useSupabaseClient();
  const user = useUser();

  return useQuery<DoTodayOffLogEntry[]>({
    queryKey: ["do_today_off_log", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("do_today_off_log")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};