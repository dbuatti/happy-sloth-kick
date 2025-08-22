import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { CustomCard } from "@/types";
import { toast } from "sonner";

export const useDashboardData = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const queryClient = useQueryClient();

  const { data: customCards, isLoading: loadingCustomCards } = useQuery<CustomCard[], Error>({
    queryKey: ["customCards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("custom_dashboard_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("card_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addCustomCard = useMutation({
    mutationFn: async (newCard: Omit<CustomCard, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("User not authenticated.");
      const { data, error } = await supabase
        .from("custom_dashboard_cards")
        .insert({ ...newCard, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customCards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] }); // Invalidate settings to update layout
    },
    onError: (error) => {
      toast.error("Failed to add custom card.");
      console.error("Error adding custom card:", error);
    },
  });

  const updateCustomCard = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<CustomCard, "user_id" | "id" | "created_at" | "updated_at">> }) => {
      if (!user) throw new Error("User not authenticated.");
      const { data, error } = await supabase
        .from("custom_dashboard_cards")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id) // Ensure user can only update their own cards
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customCards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] }); // Invalidate settings to update layout
    },
    onError: (error) => {
      toast.error("Failed to update custom card.");
      console.error("Error updating custom card:", error);
    },
  });

  const deleteCustomCard = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from("custom_dashboard_cards")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user can only delete their own cards

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customCards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] }); // Invalidate settings to update layout
    },
    onError: (error) => {
      toast.error("Failed to delete custom card.");
      console.error("Error deleting custom card:", error);
    },
  });

  return {
    customCards,
    loadingCustomCards,
    addCustomCard: addCustomCard.mutateAsync,
    updateCustomCard: updateCustomCard.mutateAsync,
    deleteCustomCard: deleteCustomCard.mutateAsync,
  };
};