"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingAddTaskButtonProps {
  onClick: () => void;
  isDemo?: boolean;
  className?: string;
}

const FloatingAddTaskButton: React.FC<FloatingAddTaskButtonProps> = ({ onClick, isDemo, className }) => {
  return (
    <Button
      onClick={onClick}
      disabled={isDemo}
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "transition-all duration-200 ease-in-out transform hover:scale-105",
        className
      )}
      aria-label="Add new task"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};

export default FloatingAddTaskButton;