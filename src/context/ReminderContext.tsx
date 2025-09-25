"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { isPast, parseISO, isValid } from 'date-fns';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client'; // Keep supabase for potential future use, but remove if truly unused in the context logic. Let's assume it's not used for now based on the error.

interface Reminder {
  id: string;
  message: string;
  remindAt: Date;
}

interface ReminderContextType {
  addReminder: (id: string, message: string, remindAt: Date) => void;
  dismissReminder: (id: string) => void;
  clearAllReminders: () => void;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addReminder = useCallback((id: string, message: string, remindAt: Date) => {
    setReminders(prev => {
      const existingIndex = prev.findIndex(r => r.id === id);
      const newReminder = { id, message, remindAt };

      if (existingIndex > -1) {
        // Update existing reminder
        const updatedReminders = [...prev];
        updatedReminders[existingIndex] = newReminder;
        return updatedReminders;
      } else {
        // Add new reminder
        return [...prev, newReminder];
      }
    });
  }, []);

  const dismissReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAllReminders = useCallback(() => {
    setReminders([]);
  }, []);

  useEffect(() => {
    // Load reminders from local storage on mount
    if (user?.id) {
      const storedReminders = localStorage.getItem(`reminders-${user.id}`);
      if (storedReminders) {
        const parsedReminders: Reminder[] = JSON.parse(storedReminders).map((r: any) => ({
          ...r,
          remindAt: parseISO(r.remindAt),
        }));
        setReminders(parsedReminders.filter(r => isValid(r.remindAt) && !isPast(r.remindAt)));
      }
    } else {
      setReminders([]); // Clear reminders if user logs out
    }
  }, [user?.id]);

  useEffect(() => {
    // Save reminders to local storage whenever they change
    if (user?.id) {
      localStorage.setItem(`reminders-${user.id}`, JSON.stringify(reminders));
    }
  }, [reminders, user?.id]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setReminders(prevReminders => {
        const updatedReminders = prevReminders.filter(reminder => {
          if (isPast(reminder.remindAt)) {
            toast.info(reminder.message, {
              description: 'This is a reminder for your task.',
              duration: 5000,
              action: {
                label: 'Dismiss',
                onClick: () => dismissReminder(reminder.id),
              },
            });
            return false; // Remove past reminder
          }
          return true; // Keep future reminder
        });
        return updatedReminders;
      });
    }, 1000 * 5); // Check every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [dismissReminder]);

  return (
    <ReminderContext.Provider value={{ addReminder, dismissReminder, clearAllReminders }}>
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