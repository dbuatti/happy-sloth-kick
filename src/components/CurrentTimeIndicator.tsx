"use client";

import React, { useState, useEffect } from 'react';
import { format, getHours, getMinutes } from 'date-fns';

interface CurrentTimeIndicatorProps {
  hourHeightPx: number;
}

const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({ hourHeightPx }) => {
  const [topPosition, setTopPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const hours = getHours(now);
      const minutes = getMinutes(now);
      const totalMinutes = hours * 60 + minutes;
      const newTop = (totalMinutes / 60) * hourHeightPx;
      setTopPosition(newTop);
    };

    updatePosition(); // Set initial position
    const intervalId = setInterval(updatePosition, 60 * 1000); // Update every minute

    return () => clearInterval(intervalId);
  }, [hourHeightPx]);

  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
      style={{ top: `${topPosition}px` }}
    >
      <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
    </div>
  );
};

export default CurrentTimeIndicator;