"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
// import { supabase } from '@/integrations/supabase/client'; // Removed as it was unused
import { toast } from 'sonner';
import { useSound } from './SoundContext';
import { useSettings } from './SettingsContext';

interface ReminderContextType {
  scheduleReminder: (id: string, title: string, remindAt: Date) => void;
  cancelReminder: (id: string) => void;
  clearAllReminders: () => void;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { playSound } = useSound();
  const { settings } = useSettings();
  const [reminders, setReminders] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const reminderQueue = useRef<{ id: string; title: string; remindAt: Date }[]>([]);

  const scheduleReminder = useCallback((id: string, title: string, remindAt: Date) => {
    if (!user) return;

    // Clear any existing reminder for this ID
    if (reminders[id]) {
      clearTimeout(reminders[id]);
      setReminders(prev => {
        const newReminders = { ...prev };
        delete newReminders[id];
        return newReminders;
      });
    }

    const now = new Date();
    const delay = remindAt.getTime() - now.getTime();

    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        toast.info(title, {
          description: "It's time for your reminder!",
          duration: 10000,
          action: {
            label: "Dismiss",
            onClick: () => toast.dismiss(),
          },
        });
        playSound('reminder');
        setReminders(prev => {
          const newReminders = { ...prev };
          delete newReminders[id];
          return newReminders;
        });
      }, delay);

      setReminders(prev => ({ ...prev, [id]: timeoutId }));
    } else {
      // If the reminder time is in the past, show it immediately if it's not already completed
      // This might need more sophisticated logic depending on how tasks are marked completed
      // For now, we'll just log it or ignore if it's too far in the past
      console.warn(`Reminder for "${title}" (ID: ${id}) was scheduled for the past.`);
    }
  }, [user, playSound, reminders]);

  const cancelReminder = useCallback((id: string) => {
    if (reminders[id]) {
      clearTimeout(reminders[id]);
      setReminders(prev => {
        const newReminders = { ...prev };
        delete newReminders[id];
        return newReminders;
      });
    }
  }, [reminders]);

  const clearAllReminders = useCallback(() => {
    Object.values(reminders).forEach(clearTimeout);
    setReminders({});
  }, [reminders]);

  // Effect to process the queue when user or settings change
  useEffect(() => {
    if (user && settings) {
      // Process any reminders that were queued before user/settings were ready
      reminderQueue.current.forEach(({ id, title, remindAt }) => {
        scheduleReminder(id, title, remindAt);
      });
      reminderQueue.current = []; // Clear the queue
    }
  }, [user, settings, scheduleReminder]);

  return (
    <ReminderContext.Provider value={{ scheduleReminder, cancelReminder, clearAllReminders }}>
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