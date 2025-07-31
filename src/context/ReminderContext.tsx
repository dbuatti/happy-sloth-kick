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

  // Refs to hold the latest versions of snoozeReminder and dismissReminder
  // These are used by scheduleReminder to call the most up-to-date versions
  const snoozeReminderRef = useRef<(taskId: string, minutes?: number) => void>(() => {});
  const dismissReminderRef = useRef<(taskId: string) => void>(() => {});

  // scheduleReminder needs to be defined first, and it will use the refs for callbacks
  const scheduleReminder = useCallback((reminder: Reminder) => {
    console.log(`[ReminderContext] scheduleReminder: Attempting to schedule reminder:`, reminder);
    if (!isValid(reminder.remindAt)) {
      console.error('[ReminderContext] scheduleReminder: Attempted to schedule an invalid date reminder. Skipping.', reminder);
      return;
    }

    const now = new Date();
    const delay = reminder.remindAt.getTime() - now.getTime();
    console.log(`[ReminderContext] scheduleReminder: Calculated delay for ${reminder.id}: ${delay}ms`);

    // Clear any existing timeout for this reminder before scheduling a new one
    // We attach _taskId to the timeout object for easy lookup
    const existingTimeoutIndex = reminderQueueRef.current.findIndex((t: any) => t._taskId === reminder.id);
    if (existingTimeoutIndex > -1) {
      clearTimeout(reminderQueueRef.current[existingTimeoutIndex]);
      reminderQueueRef.current.splice(existingTimeoutIndex, 1);
      console.log(`[ReminderContext] scheduleReminder: Cleared existing timeout for ${reminder.id}.`);
    }

    const showToastAndSetState = (r: Reminder) => {
      console.log(`[ReminderContext] scheduleReminder: Showing toast for reminder ${r.id}: ${r.message}`);
      const toastId = showReminder(
        r.message,
        r.id,
        (id) => snoozeReminderRef.current(id, 5), // Use ref here for snooze
        (id) => dismissReminderRef.current(id) // Use ref here for dismiss
      );
      setActiveReminders(prev => prev.map(rem => rem.id === r.id ? { ...rem, toastId } : rem));
      console.log(`[ReminderContext] scheduleReminder: Toast shown, ID: ${toastId}`);
    };

    if (delay <= 0) {
      // If reminder is already due or overdue, show it immediately
      showToastAndSetState(reminder);
    } else {
      // Schedule the reminder to appear in the future
      const timeoutId: any = setTimeout(() => { // Cast to any to attach custom property
        showToastAndSetState(reminder);
      }, delay);
      timeoutId._taskId = reminder.id; // Attach task ID to timeout for easier lookup
      reminderQueueRef.current.push(timeoutId);
      console.log(`[ReminderContext] scheduleReminder: Timeout ID ${timeoutId._taskId} added to queue.`);
    }
  }, []); // Dependencies: None, as it uses refs for callbacks and stable imports.

  // Now define snoozeReminder and dismissReminder, which can call scheduleReminder
  const dismissReminder = useCallback((taskId: string) => {
    console.log(`[ReminderContext] dismissReminder: Called for task ID: ${taskId}`);
    setActiveReminders(prev => {
      const reminderToDismiss = prev.find(r => r.id === taskId);
      if (reminderToDismiss && reminderToDismiss.toastId) {
        dismissToast(reminderToDismiss.toastId);
        console.log(`[ReminderContext] dismissReminder: Dismissed toast for ${taskId}.`);
      }
      // Also clear any pending timeouts for this reminder
      const timeoutIndex = reminderQueueRef.current.findIndex((t: any) => t._taskId === taskId);
      if (timeoutIndex > -1) {
        clearTimeout(reminderQueueRef.current[timeoutIndex]);
        reminderQueueRef.current.splice(timeoutIndex, 1);
        console.log(`[ReminderContext] dismissReminder: Cleared pending timeout for ${taskId}.`);
      }
      console.log(`[ReminderContext] dismissReminder: Removing reminder from active list for ${taskId}.`);
      return prev.filter(r => r.id !== taskId);
    });
  }, []); // Dependencies: [] - This is good, `dismissReminder` is stable.

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
        scheduleReminder(updatedReminder); // Call scheduleReminder directly
        console.log(`[ReminderContext] snoozeReminder: Reminder for task ${taskId} snoozed for ${minutes} minutes. Next due: ${newRemindAt.toISOString()}`);
        return prev.map(r => r.id === taskId ? updatedReminder : r);
      }
      console.log(`[ReminderContext] snoozeReminder: Reminder with task ID ${taskId} not found.`);
      return prev;
    });
  }, [scheduleReminder]); // Dependency: scheduleReminder

  // Update refs whenever snoozeReminder or dismissReminder change
  // This ensures scheduleReminder's callbacks always point to the latest versions
  useEffect(() => {
    snoozeReminderRef.current = snoozeReminder;
  }, [snoozeReminder]);

  useEffect(() => {
    dismissReminderRef.current = dismissReminder;
  }, [dismissReminder]);

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
    // Capture current active reminders to dismiss their toasts
    setActiveReminders(prevReminders => {
      prevReminders.forEach(r => {
        if (r.toastId) dismissToast(r.toastId);
      });
      return []; // Set state to empty array
    });
    // Clear all pending timeouts
    reminderQueueRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    reminderQueueRef.current = [];
    console.log('[ReminderContext] All reminders cleared.');
  }, []); // No dependencies needed here.

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