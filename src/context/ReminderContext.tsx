import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { showReminder, dismissToast } from '@/utils/toast';
import { addMinutes, isPast, isValid } from 'date-fns'; // Import isValid
import { v4 as uuidv4 } from 'uuid';

interface Reminder {
  id: string; // Task ID
  message: string;
  remindAt: Date; // When the reminder should next appear
  originalRemindAt: Date; // The original scheduled time for the reminder
  toastId?: string | number; // Updated to allow string or number
}

interface ReminderContextType {
  activeReminders: Reminder[];
  addReminder: (taskId: string, message: string, remindAt: Date) => void;
  dismissReminder: (taskId: string) => void;
  snoozeReminder: (taskId: string) => void; // Removed minutes parameter as it's hardcoded to 5
  clearAllReminders: () => void;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const reminderQueueRef = useRef<NodeJS.Timeout[]>([]);

  const snoozeReminder = useCallback((taskId: string, minutes: number = 5) => { // Added default minutes
    console.log(`[ReminderContext] snoozeReminder: Called for task ID: ${taskId}, minutes: ${minutes}`);
    setActiveReminders(prev => {
      const reminderToSnooze = prev.find(r => r.id === taskId);
      if (reminderToSnooze) {
        console.log(`[ReminderContext] snoozeReminder: Found reminder to snooze:`, reminderToSnooze);
        if (reminderToSnooze.toastId) {
          dismissToast(reminderToSnooze.toastId);
          console.log(`[ReminderContext] snoozeReminder: Dismissed existing toast for ${taskId}.`);
        }
        const newRemindAt = addMinutes(new Date(), minutes);
        const updatedReminder = { ...reminderToSnooze, remindAt: newRemindAt };
        scheduleReminder(updatedReminder);
        console.log(`[ReminderContext] snoozeReminder: Reminder for task ${taskId} snoozed for ${minutes} minutes. Next due: ${newRemindAt.toISOString()}`);
        return prev.map(r => r.id === taskId ? updatedReminder : r);
      }
      console.log(`[ReminderContext] snoozeReminder: Reminder with task ID ${taskId} not found.`);
      return prev;
    });
  }, []); // Removed scheduleReminder from dependency array as it's defined below

  const dismissReminder = useCallback((taskId: string) => {
    console.log(`[ReminderContext] dismissReminder: Called for task ID: ${taskId}`);
    setActiveReminders(prev => {
      const reminderToDismiss = prev.find(r => r.id === taskId);
      if (reminderToDismiss && reminderToDismiss.toastId) {
        dismissToast(reminderToDismiss.toastId);
        console.log(`[ReminderContext] dismissReminder: Dismissed toast for ${taskId}.`);
      }
      console.log(`[ReminderContext] dismissReminder: Removing reminder from active list for ${taskId}.`);
      return prev.filter(r => r.id !== taskId);
    });
    console.log(`[ReminderContext] dismissReminder: Reminder for task ${taskId} dismissed.`);
  }, []);

  const scheduleReminder = useCallback((reminder: Reminder) => {
    console.log(`[ReminderContext] scheduleReminder: Attempting to schedule reminder:`, reminder);
    if (!isValid(reminder.remindAt)) {
      console.error('[ReminderContext] scheduleReminder: Attempted to schedule an invalid date reminder. Skipping.', reminder);
      return; // Do not proceed with invalid date
    }

    const now = new Date();
    const delay = reminder.remindAt.getTime() - now.getTime();
    console.log(`[ReminderContext] scheduleReminder: Calculated delay for ${reminder.id}: ${delay}ms`);

    if (delay <= 0) {
      // If reminder is already due or overdue, show it immediately
      console.log(`[ReminderContext] scheduleReminder: Showing overdue reminder for task ${reminder.id}: ${reminder.message}`);
      const toastId = showReminder(
        reminder.message,
        reminder.id,
        (id) => snoozeReminder(id, 5), // Default snooze for 5 minutes
        (id) => dismissReminder(id)
      );
      setActiveReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, toastId } : r));
      console.log(`[ReminderContext] scheduleReminder: Toast shown, ID: ${toastId}`);
    } else {
      // Schedule the reminder to appear in the future
      console.log(`[ReminderContext] scheduleReminder: Scheduling reminder for task ${reminder.id} in ${delay / 1000} seconds.`);
      const timeoutId = setTimeout(() => {
        console.log(`[ReminderContext] scheduleReminder: Timeout triggered for task ${reminder.id}. Showing toast.`);
        const toastId = showReminder(
          reminder.message,
          reminder.id,
          (id) => snoozeReminder(id, 5), // Default snooze for 5 minutes
          (id) => dismissReminder(id)
        );
        setActiveReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, toastId } : r));
        console.log(`[ReminderContext] scheduleReminder: Toast shown, ID: ${toastId}`);
      }, delay);
      reminderQueueRef.current.push(timeoutId);
      console.log(`[ReminderContext] scheduleReminder: Timeout ID ${timeoutId} added to queue.`);
    }
  }, [dismissReminder, snoozeReminder]); // Added dismissReminder, snoozeReminder to dependencies

  const addReminder = useCallback((taskId: string, message: string, remindAt: Date) => {
    console.log(`[ReminderContext] addReminder: Called for task ID: ${taskId}, message: "${message}", remindAt: ${remindAt.toISOString()}, isValid: ${isValid(remindAt)}`);
    if (!isValid(remindAt)) { // Add isValid check here too, at the entry point
      console.error('[ReminderContext] addReminder: addReminder called with invalid date. Skipping.', remindAt);
      return;
    }
    setActiveReminders(prev => {
      const existingReminder = prev.find(r => r.id === taskId);
      if (existingReminder) {
        console.log(`[ReminderContext] addReminder: Existing reminder found for ${taskId}.`);
        // Update existing reminder if time changes or it's snoozed
        if (existingReminder.remindAt.getTime() !== remindAt.getTime()) {
          console.log(`[ReminderContext] addReminder: Existing reminder time changed. Updating.`);
          // Clear any pending timeouts for this reminder
          if (existingReminder.toastId) {
            dismissToast(existingReminder.toastId);
            console.log(`[ReminderContext] addReminder: Dismissed old toast for ${taskId}.`);
          }
          const updatedReminder = { ...existingReminder, message, remindAt };
          scheduleReminder(updatedReminder);
          return prev.map(r => r.id === taskId ? updatedReminder : r);
        }
        console.log(`[ReminderContext] addReminder: Existing reminder time unchanged. No update needed.`);
        return prev; // No change needed
      } else {
        // Add new reminder
        console.log(`[ReminderContext] addReminder: No existing reminder found for ${taskId}. Adding new one.`);
        const newReminder: Reminder = { id: taskId, message, remindAt, originalRemindAt: remindAt };
        scheduleReminder(newReminder);
        return [...prev, newReminder];
      }
    });
  }, [scheduleReminder]);

  const clearAllReminders = useCallback(() => {
    console.log('[ReminderContext] clearAllReminders: Clearing all active reminders.');
    activeReminders.forEach(r => {
      if (r.toastId) dismissToast(r.toastId);
    });
    reminderQueueRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    reminderQueueRef.current = [];
    setActiveReminders([]);
    console.log('[ReminderContext] All reminders cleared.');
  }, [activeReminders]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    console.log('[ReminderContext] Effect: Component mounted. Setting up cleanup for timeouts.');
    return () => {
      console.log('[ReminderContext] Effect: Component unmounting. Clearing all pending timeouts.');
      reminderQueueRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []);

  return (
    <ReminderContext.Provider value={{ activeReminders, addReminder, dismissReminder, snoozeReminder, clearAllReminders }}>
      {children}
    </ReminderContext.Provider>
  );
};

export const useReminders = () => {
  const context = useContext(ReminderContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
};