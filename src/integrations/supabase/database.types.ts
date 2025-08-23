export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      custom_dashboard_cards: {
        Args: {
          is_visible?: boolean
        }
        Row: {
          card_order: number | null
          content: string | null
          created_at: string | null
          emoji: string | null
          id: string
          is_visible: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_order?: number | null
          content?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_visible?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_order?: number | null
          content?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_visible?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_dashboard_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_idea_tag_associations: {
        Row: {
          idea_id: string
          tag_id: string
        }
        Insert: {
          idea_id: string
          tag_id: string
        }
        Update: {
          idea_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_idea_tag_associations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "dev_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dev_idea_tag_associations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "dev_idea_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_idea_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_idea_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_ideas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          local_file_path: string | null
          priority: Database["public"]["Enums"]["dev_idea_priority"]
          status: Database["public"]["Enums"]["dev_idea_status"]
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          local_file_path?: string | null
          priority?: Database["public"]["Enums"]["dev_idea_priority"]
          status?: Database["public"]["Enums"]["dev_idea_status"]
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          local_file_path?: string | null
          priority?: Database["public"]["Enums"]["dev_idea_priority"]
          status?: Database["public"]["Enums"]["dev_idea_status"]
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      do_today_off_log: {
        Row: {
          created_at: string | null
          id: string
          off_date: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          off_date: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          off_date?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "do_today_off_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "do_today_off_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed_during_session: boolean | null
          duration_minutes: number
          end_time: string | null
          id: string
          session_type: string
          start_time: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed_during_session?: boolean | null
          duration_minutes: number
          end_time?: string | null
          id?: string
          session_type: string
          start_time?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed_during_session?: boolean | null
          duration_minutes?: number
          end_time?: string | null
          id?: string
          session_type?: string
          start_time?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gratitude_journal_entries: {
        Row: {
          created_at: string
          entry: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gratitude_journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      people_memory: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          first_name?: string | null
          id: string
          last_name?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          current_count: number
          description: string | null
          id: string
          link: string | null
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_count?: number
          description?: string | null
          id?: string
          link?: string | null
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_count?: number
          description?: string | null
          id?: string
          link?: string | null
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_links: {
        Row: {
          avatar_text: string | null
          background_color: string | null
          created_at: string | null
          emoji: string | null
          id: string
          image_url: string | null
          link_order: number | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          avatar_text?: string | null
          background_color?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          link_order?: number | null
          title: string
          url: string
          user_id: string
        }
        Update: {
          avatar_text?: string | null
          background_color?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          link_order?: number | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_appointments: {
        Row: {
          color: string
          created_at: string | null
          date: string
          description: string | null
          end_time: string
          id: string
          start_time: string
          task_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          date: string
          description?: string | null
          end_time: string
          id?: string
          start_time: string
          task_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string
          id?: string
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_appointments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_records: {
        Row: {
          bed_time: string | null
          created_at: string
          date: string
          get_out_of_bed_time: string | null
          id: string
          lights_off_time: string | null
          planned_wake_up_time: string | null
          sleep_interruptions_count: number | null
          sleep_interruptions_duration_minutes: number | null
          time_to_fall_asleep_minutes: number | null
          times_left_bed_count: number | null
          updated_at: string
          user_id: string
          wake_up_time: string | null
        }
        Insert: {
          bed_time?: string | null
          created_at?: string
          date: string
          get_out_of_bed_time?: string | null
          id?: string
          lights_off_time?: string | null
          planned_wake_up_time?: string | null
          sleep_interruptions_count?: number | null
          sleep_interruptions_duration_minutes?: number | null
          time_to_fall_asleep_minutes?: number | null
          times_left_bed_count?: number | null
          updated_at?: string
          user_id: string
          wake_up_time?: string | null
        }
        Update: {
          bed_time?: string | null
          created_at?: string
          date?: string
          get_out_of_bed_time?: string | null
          id?: string
          lights_off_time?: string | null
          planned_wake_up_time?: string | null
          sleep_interruptions_count?: number | null
          sleep_interruptions_duration_minutes?: number | null
          time_to_fall_asleep_minutes?: number | null
          times_left_bed_count?: number | null
          updated_at?: string
          user_id?: string
          wake_up_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sections: {
        Row: {
          created_at: string | null
          id: string
          include_in_focus_mode: boolean | null
          name: string
          order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          include_in_focus_mode?: boolean | null
          name: string
          order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          include_in_focus_mode?: boolean | null
          name?: string
          order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          image_url: string | null
          link: string | null
          notes: string | null
          order: number | null
          original_task_id: string | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          recurring_type: Database["public"]["Enums"]["recurring_type"] | null
          remind_at: string | null
          section_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          notes?: string | null
          order?: number | null
          original_task_id?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurring_type?: Database["public"]["Enums"]["recurring_type"] | null
          remind_at?: string | null
          section_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          notes?: string | null
          order?: number | null
          original_task_id?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurring_type?: Database["public"]["Enums"]["recurring_type"] | null
          remind_at?: string | null
          section_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_original_task_id_fkey"
            columns: ["original_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "task_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          dashboard_layout: Json | null
          focused_task_id: string | null
          future_tasks_days_visible: number
          meditation_notes: string | null
          project_tracker_title: string
          schedule_show_focus_tasks_only: boolean
          user_id: string
          visible_pages: Json | null
        }
        Insert: {
          dashboard_layout?: Json | null
          focused_task_id?: string | null
          future_tasks_days_visible?: number
          meditation_notes?: string | null
          project_tracker_title?: string
          schedule_show_focus_tasks_only?: boolean
          user_id: string
          visible_pages?: Json | null
        }
        Update: {
          dashboard_layout?: Json | null
          focused_task_id?: string | null
          future_tasks_days_visible?: number
          meditation_notes?: string | null
          project_tracker_title?: string
          schedule_show_focus_tasks_only?: boolean
          user_id?: string
          visible_pages?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_focused_task_id_fkey"
            columns: ["focused_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_work_hours: {
        Row: {
          day_of_week: string
          enabled: boolean | null
          end_time: string
          id: string
          start_time: string
          user_id: string
        }
        Insert: {
          day_of_week: string
          enabled?: boolean | null
          end_time: string
          id?: string
          start_time: string
          user_id: string
        }
        Update: {
          day_of_week?: string
          enabled?: boolean | null
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_work_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_focus: {
        Row: {
          created_at: string | null
          id: string
          primary_focus: string | null
          secondary_focus: string | null
          tertiary_focus: string | null
          updated_at: string | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          primary_focus?: string | null
          secondary_focus?: string | null
          tertiary_focus?: string | null
          updated_at?: string | null
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          primary_focus?: string | null
          secondary_focus?: string | null
          tertiary_focus?: string | null
          updated_at?: string | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_focus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      worry_journal_entries: {
        Row: {
          created_at: string | null
          thought: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          thought: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          thought?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worry_journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_demo_data: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_sections_order: {
        Args: {
          updates: Json
        }
        Returns: void
      }
      update_tasks_order: {
        Args: {
          updates: Json
        }
        Returns: void
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      dev_idea_priority: "low" | "medium" | "high" | "urgent"
      dev_idea_status: "idea" | "in-progress" | "completed" | "archived"
      recurring_type: "none" | "daily" | "weekly" | "monthly" | "yearly"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "to-do" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never