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
      "bg-gradient-to-r from-[hsl(var(--gradient-start-light))] to-[hsl(var(--gradient-end-light))] dark:from-[hsl(var(--gradient-start-dark))] dark:to-[hsl(var(--gradient-end-dark))]", // Changed gradient to use theme's general gradient variables
      "text-primary-foreground dark:text-foreground",
      "flex flex-col items-center justify-center text-center"
    )}>
      <p className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 font-bubbly">
        {formattedTime}
      </p>
      <p className="text-lg md:text-xl font-semibold text-muted-foreground">
        {formattedDate}
      </p>
    </div>
  );
};

export default ADHDTimeDateBanner;