"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface TaskSkeletonProps {
  level?: number;
  className?: string;
}

const TaskSkeleton: React.FC<TaskSkeletonProps> = ({ level = 0, className }) => {
  return (
    <div
      className={cn(
        "relative flex items-center w-full rounded-xl transition-all duration-300 py-2 pl-4 pr-3 shadow-sm border bg-card text-foreground border-border animate-pulse",
        `pl-${level * 8}`,
        className
      )}
    >
      {/* Priority Pill Placeholder */}
      <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl bg-muted-foreground/30" />

      {/* Drag Handle Placeholder */}
      <div className="h-8 w-8 flex-shrink-0 bg-muted-foreground/20 rounded-full -ml-1 mr-1" />

      {/* Expand/Collapse Button Placeholder */}
      <div className="flex-shrink-0 pr-2 flex items-center">
        <div className="h-8 w-8 bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Selection Checkbox Placeholder */}
      <div className="flex-shrink-0 mr-3">
        <div className="h-4 w-4 bg-muted-foreground/20 rounded border-2" />
      </div>

      {/* Completion Checkbox Placeholder */}
      <div className="flex-shrink-0 mr-3">
        <div className="h-4 w-4 bg-muted-foreground/20 rounded-full border-2" />
      </div>

      {/* Text Content Placeholder */}
      <div className="flex-grow flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 min-w-0 py-1">
        <div className="flex-grow min-w-0 w-full">
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-1" />
          <div className="h-3 bg-muted-foreground/10 rounded w-1/2" />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 mt-1 sm:mt-0">
          <div className="h-5 w-16 bg-muted-foreground/20 rounded-full" />
          <div className="h-5 w-5 bg-muted-foreground/20 rounded-full" />
        </div>
      </div>

      {/* Actions Area Placeholder */}
      <div className="flex-shrink-0 flex items-center gap-1 ml-2">
        <div className="h-7 w-7 bg-muted-foreground/20 rounded-full" />
        <div className="h-7 w-7 bg-muted-foreground/20 rounded-full" />
      </div>
    </div>
  );
};

export default TaskSkeleton;