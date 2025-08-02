import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';
import { useSound } from '@/context/SoundContext';
import { showSuccess } from '@/utils/toast';

const upliftingMessages = [
  "You're doing great!",
  "Keep up the amazing work!",
  "Every step counts!",
  "You've got this!",
  "Shine bright today!",
  "Believe in yourself!",
  "You're making progress!",
  "Awesome job!",
  "Stay positive!",
  "You're a star!",
];

const MoodBoosterButton: React.FC = () => {
  const { playSound } = useSound();

  const handleClick = useCallback(() => {
    playSound('success'); // Play a positive sound
    const randomMessage = upliftingMessages[Math.floor(Math.random() * upliftingMessages.length)];
    showSuccess(randomMessage); // Show an uplifting toast message
  }, [playSound]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label="Boost your mood"
      className="h-9 w-9"
    >
      <Sparkles className="h-5 w-5 text-primary" />
    </Button>
  );
};

export default MoodBoosterButton;