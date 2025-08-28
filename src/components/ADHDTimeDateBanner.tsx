import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ADHDTimeDateBanner: React.FC = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = format(currentDateTime, 'h:mm:ss a');
  const formattedDate = format(currentDateTime, 'EEEE, MMMM d, yyyy');

  return (
    <div className={cn(
      "w-full p-4 mb-6 rounded-xl shadow-lg",
      "bg-gradient-to-r from-[hsl(var(--gradient-start-light))] to-[hsl(var(--gradient-end-light))] dark:from-[hsl(var(--gradient-start-dark))] dark:to-[hsl(var(--gradient-end-dark))]",
      "text-primary-foreground dark:text-foreground",
      "flex items-center justify-between"
    )}>
      <p className="text-lg md:text-xl font-semibold text-muted-foreground">
        {formattedDate}
      </p>
      <p className="text-4xl md:text-5xl font-extrabold tracking-tight font-bubbly text-foreground"> {/* Changed to text-foreground */}
        {formattedTime}
      </p>
    </div>
  );
};

export default ADHDTimeDateBanner;