"use client";

import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
  icon?: React.ElementType;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  buttonText,
  onButtonClick,
  icon: Icon = PlusCircle,
  className,
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center text-muted-foreground rounded-lg border border-dashed",
      className
    )}>
      <Icon className="h-12 w-12 mb-4 text-primary/60" />
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm mb-6">{description}</p>
      {buttonText && onButtonClick && (
        <Button onClick={onButtonClick} variant="secondary">
          {buttonText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;