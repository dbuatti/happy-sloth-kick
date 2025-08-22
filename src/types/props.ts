import { Task } from './supabase';

export interface TaskActionProps {
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, checked: boolean) => void;
}