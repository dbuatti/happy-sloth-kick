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
  success: '/sounds/success.mp3', // Placeholder for a positive/completion sound
  pause: '/sounds/pause.mp3',     // Placeholder for a pause sound
  reset: '/sounds/reset.mp3',     // Placeholder for a reset sound
  alert: '/sounds/alert.mp3',     // Placeholder for an alert/notification sound (e.g., timer end)
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