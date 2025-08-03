import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FloatingTimer: React.FC = () => {
  const navigate = useNavigate();
  const timerOptions = [5, 10, 15, 20, 25];

  const startTimer = (minutes: number) => {
    navigate('/focus', { state: { duration: minutes * 60 } });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50" size="icon">
          <Timer className="h-7 w-7" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 mb-2" side="top" align="end">
        <div className="flex flex-col gap-2">
          {timerOptions.map(minutes => (
            <Button key={minutes} variant="ghost" onClick={() => startTimer(minutes)}>
              {minutes} minutes
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FloatingTimer;