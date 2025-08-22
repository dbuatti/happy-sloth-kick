"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TaskCategory } from "@/types";
import { useAuth } from "@/hooks/useAuth"; // Assuming useAuth exists for user_id

export function useTaskCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const fetchCategories = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("task_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        setError(error.message);
        setCategories([]);
      } else {
        setCategories(data as TaskCategory[]);
      }
      setLoading(false);
    };

    fetchCategories();

    const channel = supabase
      .channel("task_categories_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_categories", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCategories((prev) => [...prev, payload.new as TaskCategory]);
          } else if (payload.eventType === "UPDATE") {
            setCategories((prev) =>
              prev.map((category) =>
                category.id === payload.old.id ? (payload.new as TaskCategory) : category
              )
            );
          } else if (payload.eventType === "DELETE") {
            setCategories((prev) => prev.filter((category) => category.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addCategory = async (category: Omit<TaskCategory, "id" | "user_id" | "created_at">) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("task_categories")
      .insert({ ...category, user_id: user.id })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      console.log("Category added:", data);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Omit<TaskCategory, "id" | "user_id" | "created_at">>) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("task_categories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      console.log("Category updated:", data);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { error } = await supabase
      .from("task_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
    } else {
      console.log("Category deleted:", id);
    }
  };

  return { categories, loading, error, addCategory, updateCategory, deleteCategory };
}