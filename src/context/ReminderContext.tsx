"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { isPast, parseISO, isValid, differenceInMinutes } from 'date-fns';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Reminder {
  id: string;
  message: string;
  remindAt: Date;
}

interface ReminderContextType {
  addReminder: (id: string, message: string, remindAt: Date) => void;
  dismissReminder: (id: string) => void;
  clearAllReminders: () => void;
  reminders: Reminder[];
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addReminder = useCallback((id: string, message: string, remindAt: Date) => {
    if (!isValid(remindAt) || isPast(remindAt)) {
      // console.log(`Reminder for task ${id} is in the past or invalid, not adding.`);
      return;
    }
    setReminders(prev => {
      const existingIndex = prev.findIndex(r => r.id === id);
      if (existingIndex > -1) {
        const newReminders = [...prev];
        newReminders[existingIndex] = { id, message, remindAt };
        return newReminders;
      }
      return [...prev, { id, message, remindAt }];
    });
  }, []);

  const dismissReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    // console.log(`Reminder for task ${id} dismissed.`);
  }, []);

  const clearAllReminders = useCallback(() => {
    setReminders([]);
  }, []);

  // Load reminders from local storage on mount
  useEffect(() => {
    if (user?.id) {
      const storedReminders = localStorage.getItem(`reminders-${user.id}`);
      if (storedReminders) {
        try {
          const parsedReminders: Reminder[] = JSON.parse(storedReminders).map((r: any) => ({
            ...r,
            remindAt: parseISO(r.remindAt),
          }));
          setReminders(parsedReminders.filter(r => isValid(r.remindAt) && !isPast(r.remindAt)));
        } catch (e) {
          console.error("Failed to parse stored reminders:", e);
          localStorage.removeItem(`reminders-${user.id}`);
        }
      }
    } else {
      setReminders([]); // Clear reminders if user logs out
    }
  }, [user?.id]);

  // Save reminders to local storage whenever they change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`reminders-${user.id}`, JSON.stringify(reminders.map(r => ({
        ...r,
        remindAt: r.remindAt.toISOString(),
      }))));
    }
  }, [reminders, user?.id]);

  // Reminder check interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const now = new Date();
      setReminders(prevReminders => {
        const updatedReminders = prevReminders.filter(reminder => {
          if (isPast(reminder.remindAt)) {
            toast.info(reminder.message, {
              duration: 10000, // Display for 10 seconds
              action: {
                label: 'Dismiss',
                onClick: () => dismissReminder(reminder.id),
              },
            });
            return false; // Remove reminder
          }
          return true;
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
    <ReminderContext.Provider value={{ addReminder, dismissReminder, clearAllReminders, reminders }}>
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