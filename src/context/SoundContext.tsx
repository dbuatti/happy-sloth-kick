import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (soundName: keyof typeof soundConfig) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

interface SoundConfigItem {
  frequency: number;
  type: OscillatorType;
  duration: number;
  repeat?: number;
}

const soundConfig: Record<string, SoundConfigItem> = {
  success: { frequency: 880, type: 'sine', duration: 0.1 },
  pause: { frequency: 440, type: 'sine', duration: 0.1 },
  reset: { frequency: 220, type: 'sine', duration: 0.1 },
  alert: { frequency: 660, type: 'triangle', duration: 0.2, repeat: 2 },
  start: { frequency: 550, type: 'sine', duration: 0.1 },
  complete: { frequency: 770, type: 'sine', duration: 0.3 },
  delete: { frequency: 110, type: 'sawtooth', duration: 0.15 },
  move: { frequency: 330, type: 'square', duration: 0.05 },
  focus: { frequency: 150, type: 'sine', duration: 0.5 },
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      console.warn('Web Audio API is not supported in this browser.');
      return null;
    }
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Could not create AudioContext:", e);
        return null;
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((soundName: keyof typeof soundConfig) => {
    if (!isSoundEnabled) return;

    const audioContext = getAudioContext();
    if (!audioContext) return;

    const config = soundConfig[soundName];
    if (!config) {
      console.warn(`Sound "${soundName}" not found.`);
      return;
    }

    let playCount = 0;
    const repeatCount = config.repeat || 1;

    const playSingleSound = () => {
      if (playCount >= repeatCount) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);
      oscillator.stop(audioContext.currentTime + config.duration + 0.05);

      oscillator.onended = () => {
        playCount++;
        if (playCount < repeatCount) {
          setTimeout(playSingleSound, 100);
        }
      };
    };

    playSingleSound();
  }, [isSoundEnabled, getAudioContext]);

  const toggleSound = useCallback(() => {
    getAudioContext(); 
    setIsSoundEnabled(prev => !prev);
  }, [getAudioContext]);

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