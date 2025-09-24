import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingAddGoalButtonProps {
  onClick: () => void;
  isDemo?: boolean;
}

const FloatingAddGoalButton: React.FC<FloatingAddGoalButtonProps> = ({ onClick, isDemo = false }) => {
  return (
    <Button
      onClick={onClick}
      disabled={isDemo}
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "transition-all duration-200 ease-in-out",
        isDemo && "opacity-70 cursor-not-allowed"
      )}
      size="icon"
      aria-label="Add new goal"
    >
      <Plus className="h-7 w-7" />
    </Button>
  );
};

export default FloatingAddGoalButton;