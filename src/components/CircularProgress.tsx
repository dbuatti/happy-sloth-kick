import React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  progress: number;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ progress, className }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg className={cn("absolute inset-0 h-full w-full", className)} viewBox="0 0 100 100">
      <circle
        className="text-muted/30"
        strokeWidth="10"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
      />
      <circle
        className="text-primary"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          transition: 'stroke-dashoffset 1s linear',
        }}
      />
    </svg>
  );
};

export default CircularProgress;