import { useQuery, useMutation, useQueryClient, UseMutateAsyncFunction } from "@tanstack/react-query";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { UserSettings } from "@/types";
import { toast } from "sonner";

export const useUserSettings = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: loading } = useQuery<UserSettings | null, Error>({
    queryKey: ["userSettings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for initial settings
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<Omit<UserSettings, "user_id">>) => {
      if (!user) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from("user_settings")
        .upsert({ ...newSettings, user_id: user.id }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
      toast.success("Settings updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update settings.");
      console.error("Error updating settings:", error);
    },
  });

  return { settings, loading, updateSettings: updateSettings.mutateAsync };
};