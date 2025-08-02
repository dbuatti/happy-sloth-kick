import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { showReminder, dismissToast } from '@/utils/toast';
import { addMinutes, isValid } from 'date-fns';

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
    setActiveReminders(prev => {
      const reminderToSnooze = prev.find(r => r.id === taskId);
      if (reminderToSnooze) {
        if (reminderToSnooze.toastId) dismissToast(reminderToSnooze.toastId);
        const newRemindAt = addMinutes(new Date(), minutes);
        const updatedReminder = { ...reminderToSnooze, remindAt: newRemindAt };
        scheduleReminder(updatedReminder);
        console.log(`Reminder for task ${taskId} snoozed for ${minutes} minutes. Next due: ${newRemindAt.toISOString()}`);
        return prev.map(r => r.id === taskId ? updatedReminder : r);
      }
      return prev;
    });
  }, []); // Removed scheduleReminder from dependency array as it's defined below

  const dismissReminder = useCallback((taskId: string) => {
    setActiveReminders(prev => {
      const reminderToDismiss = prev.find(r => r.id === taskId);
      if (reminderToDismiss && reminderToDismiss.toastId) {
        dismissToast(reminderToDismiss.toastId);
      }
      return prev.filter(r => r.id !== taskId);
    });
    console.log(`Reminder for task ${taskId} dismissed.`);
  }, []);

  const scheduleReminder = useCallback((reminder: Reminder) => {
    if (!isValid(reminder.remindAt)) {
      console.error('ReminderContext: Attempted to schedule an invalid date reminder:', reminder);
      return; // Do not proceed with invalid date
    }

    const now = new Date();
    const delay = reminder.remindAt.getTime() - now.getTime();

    if (delay <= 0) {
      // If reminder is already due or overdue, show it immediately
      console.log(`Showing overdue reminder for task ${reminder.id}: ${reminder.message}`);
      const toastId = showReminder(
        reminder.message,
        reminder.id,
        (id) => snoozeReminder(id, 5), // Default snooze for 5 minutes
        (id) => dismissReminder(id)
      );
      setActiveReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, toastId } : r));
    } else {
      // Schedule the reminder to appear in the future
      console.log(`Scheduling reminder for task ${reminder.id} in ${delay / 1000} seconds.`);
      const timeoutId = setTimeout(() => {
        const toastId = showReminder(
          reminder.message,
          reminder.id,
          (id) => snoozeReminder(id, 5), // Default snooze for 5 minutes
          (id) => dismissReminder(id)
        );
        setActiveReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, toastId } : r));
      }, delay);
      reminderQueueRef.current.push(timeoutId);
    }
  }, [dismissReminder, snoozeReminder]);

  const addReminder = useCallback((taskId: string, message: string, remindAt: Date) => {
    if (!isValid(remindAt)) { // Add isValid check here too, at the entry point
      console.error('ReminderContext: addReminder called with invalid date:', remindAt);
      return;
    }
    setActiveReminders(prev => {
      const existingReminder = prev.find(r => r.id === taskId);
      if (existingReminder) {
        // Update existing reminder if time changes or it's snoozed
        if (existingReminder.remindAt.getTime() !== remindAt.getTime()) {
          // Clear any pending timeouts for this reminder
          if (existingReminder.toastId) dismissToast(existingReminder.toastId);
          const updatedReminder = { ...existingReminder, message, remindAt };
          scheduleReminder(updatedReminder);
          return prev.map(r => r.id === taskId ? updatedReminder : r);
        }
        return prev; // No change needed
      } else {
        // Add new reminder
        const newReminder: Reminder = { id: taskId, message, remindAt, originalRemindAt: remindAt };
        scheduleReminder(newReminder);
        return [...prev, newReminder];
      }
    });
  }, [scheduleReminder]);

  const clearAllReminders = useCallback(() => {
    activeReminders.forEach(r => {
      if (r.toastId) dismissToast(r.toastId);
    });
    reminderQueueRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    reminderQueueRef.current = [];
    setActiveReminders([]);
    console.log('All reminders cleared.');
  }, [activeReminders]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
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