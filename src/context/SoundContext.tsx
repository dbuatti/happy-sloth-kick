import React, { createContext, useContext, useState, useCallback } from 'react';

interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (soundName: keyof typeof soundConfig) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

// Define configurations for generic computer-generated sounds
const soundConfig = {
  success: { frequency: 880, type: 'sine' as OscillatorType, duration: 0.1 }, // A short, high-pitched tone
  pause: { frequency: 440, type: 'sine' as OscillatorType, duration: 0.1 },    // A short, mid-range tone
  reset: { frequency: 220, type: 'sine' as OscillatorType, duration: 0.1 },    // A short, low-pitched tone
  alert: { frequency: 660, type: 'triangle' as OscillatorType, duration: 0.2, repeat: 2 }, // A slightly longer, distinct tone
  start: { frequency: 550, type: 'sine' as OscillatorType, duration: 0.1 },    // A short, mid-high tone
  complete: { frequency: 770, type: 'sine' as OscillatorType, duration: 0.3 }, // A slightly longer, satisfying tone
  delete: { frequency: 110, type: 'sawtooth' as OscillatorType, duration: 0.15 }, // A short, descending tone
  move: { frequency: 330, type: 'square' as OscillatorType, duration: 0.05 },  // A very short, subtle click/tone
  focus: { frequency: 150, type: 'sine' as OscillatorType, duration: 0.5 },    // A sustained, low, calming tone
};

// Function to generate and play a sound using Web Audio API
const generateSound = (config: { frequency: number; type: OscillatorType; duration: number; repeat?: number }) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Set initial volume

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    let playCount = 0;
    const playSingleSound = () => {
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration + 0.05); // Fade out

      oscillator.onended = () => {
        playCount++;
        if (config.repeat && playCount < config.repeat) {
          setTimeout(playSingleSound, 100); // Short delay between repeats
        } else {
          audioContext.close(); // Clean up context after sound finishes
        }
      };
    };

    playSingleSound();

  } catch (error) {
    console.warn('Error generating audio:', error);
    // This catch is important for handling user gesture requirements in browsers
  }
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  const playSound = useCallback((soundName: keyof typeof soundConfig) => {
    if (isSoundEnabled) {
      const config = soundConfig[soundName];
      if (config) {
        generateSound(config);
      } else {
        console.warn(`Sound "${soundName}" not found in soundConfig.`);
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