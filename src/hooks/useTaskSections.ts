"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TaskSection } from "@/types";
import { useAuth } from "@/hooks/useAuth"; // Assuming useAuth exists for user_id

export function useTaskSections() {
  const { user } = useAuth();
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSections([]);
      setLoading(false);
      return;
    }

    const fetchSections = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("task_sections")
        .select("*")
        .eq("user_id", user.id)
        .order("order", { ascending: true });

      if (error) {
        setError(error.message);
        setSections([]);
      } else {
        setSections(data as TaskSection[]);
      }
      setLoading(false);
    };

    fetchSections();

    const channel = supabase
      .channel("task_sections_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_sections", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSections((prev) => [...prev, payload.new as TaskSection]);
          } else if (payload.eventType === "UPDATE") {
            setSections((prev) =>
              prev.map((section) =>
                section.id === payload.old.id ? (payload.new as TaskSection) : section
              )
            );
          } else if (payload.eventType === "DELETE") {
            setSections((prev) => prev.filter((section) => section.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addSection = async (section: Omit<TaskSection, "id" | "user_id" | "created_at">) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("task_sections")
      .insert({ ...section, user_id: user.id })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      console.log("Section added:", data);
    }
  };

  const updateSection = async (id: string, updates: Partial<Omit<TaskSection, "id" | "user_id" | "created_at">>) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { data, error } = await supabase
      .from("task_sections")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      console.log("Section updated:", data);
    }
  };

  const deleteSection = async (id: string) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { error } = await supabase
      .from("task_sections")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
    } else {
      console.log("Section deleted:", id);
    }
  };

  const reorderSections = async (orderedSections: TaskSection[]) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const updates = orderedSections.map((section, index) => ({
      id: section.id,
      order: index,
    }));

    const { error } = await supabase
      .from("task_sections")
      .upsert(updates, { onConflict: "id" });

    if (error) {
      setError(error.message);
    } else {
      console.log("Sections reordered.");
    }
  };

  const updateSectionIncludeInFocusMode = async (id: string, include: boolean) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { error } = await supabase
      .from("task_sections")
      .update({ include_in_focus_mode: include })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
    } else {
      console.log(`Section ${id} focus mode updated to ${include}`);
    }
  };

  return {
    sections,
    loading,
    error,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    updateSectionIncludeInFocusMode,
  };
}