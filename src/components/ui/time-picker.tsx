"use client";

import * as React from "react";
import { format, setHours, setMinutes, isValid } from "date-fns";
import { Clock as ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({ date, setDate, placeholder = "Select time", disabled = false }) => {
  const [timeInput, setTimeInput] = React.useState(date ? format(date, "HH:mm") : "");

  React.useEffect(() => {
    setTimeInput(date ? format(date, "HH:mm") : "");
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeInput(value);

    const [hoursStr, minutesStr] = value.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      let newDate = date || new Date();
      newDate = setHours(newDate, hours);
      newDate = setMinutes(newDate, minutes);
      setDate(newDate);
    } else if (value === "") {
      setDate(undefined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <ClockIcon className="mr-2 h-4 w-4" />
          {date && isValid(date) ? format(date, "HH:mm") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Input
          type="time"
          value={timeInput}
          onChange={handleInputChange}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  );
};

export default TimePicker;