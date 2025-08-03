import React, { createContext, useContext, useState, useCallback } from 'react';

interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (soundName: keyof typeof soundMap) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

// Define a map of sound names to their URLs
// IMPORTANT: Replace these placeholder URLs with actual links to your hosted sound files.
// You can find free sound effects on sites like freesound.org or zapsplat.com.
const soundMap = {
  success: '/sounds/success.mp3', // A positive, uplifting chime for completions
  pause: '/sounds/pause.mp3',     // A short, neutral tone for pausing
  reset: '/sounds/reset.mp3',     // A soft, descending tone for resetting
  alert: '/sounds/alert.mp3',     // A clear, attention-grabbing sound for timers ending
  start: '/sounds/start.mp3',     // A short, ascending tone for starting timers
  complete: '/sounds/complete.mp3', // A satisfying, longer chime for task completion
  delete: '/sounds/delete.mp3',   // A short, slightly negative tone for deletions
  move: '/sounds/move.mp3',       // A subtle "whoosh" or "click" for reordering
  focus: '/sounds/focus.mp3',     // A gentle, focusing sound for entering focus mode
};

// Function to play an audio file from a URL
const playAudioFile = (url: string) => {
  if (!url) {
    console.warn('Attempted to play sound with empty URL.');
    return;
  }
  try {
    const audio = new Audio(url);
    audio.volume = 0.5; // Adjust volume as needed
    audio.play().catch(error => {
      console.warn('Error playing audio:', error);
      // This catch is important for handling user gesture requirements in browsers
    });
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  const playSound = useCallback((soundName: keyof typeof soundMap) => {
    if (isSoundEnabled) {
      const soundUrl = soundMap[soundName];
      if (soundUrl) {
        playAudioFile(soundUrl);
      } else {
        console.warn(`Sound "${soundName}" not found in soundMap.`);
      }
    }
  }, [isSoundEnabled]);

  return (
    <SoundContext.Provider value={{ isSoundEnabled, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};