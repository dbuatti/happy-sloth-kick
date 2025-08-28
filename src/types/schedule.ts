import { Appointment } from '@/hooks/useAppointments';
import { Task } from '@/hooks/useTasks';

export type ScheduleEvent = Appointment | Task;

export interface ScheduleItemProps {
  event: ScheduleEvent;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
  className?: string;
  id: string; // DND requires a unique ID
  isOverlay?: boolean;
  isScheduledTask?: boolean; // To differentiate tasks from appointments
}