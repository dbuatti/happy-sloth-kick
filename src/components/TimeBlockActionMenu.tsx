import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, ListTodo } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Task, TaskSection } from '@/types/task';
import { TimeBlockActionMenuProps } from '@/types/props';

export const TimeBlockActionMenu: React.FC<TimeBlockActionMenuProps> = ({
  block,
  onAddAppointment,
  onScheduleTask,
  unscheduledTasks,
  sections,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'addAppointment' | 'scheduleTask' | null>(null);

  const handleSelectAction = (action: 'addAppointment' | 'scheduleTask') => {
    setSelectedAction(action);
    if (action === 'addAppointment') {
      onAddAppointment(block);
      setIsPopoverOpen(false);
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandList>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleSelectAction('addAppointment')}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Add Appointment</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelectAction('scheduleTask')}>
                <ListTodo className="mr-2 h-4 w-4" />
                <span>Schedule Task</span>
              </CommandItem>
            </CommandGroup>
            {selectedAction === 'scheduleTask' && (
              <>
                <CommandSeparator />
                <CommandInput placeholder="Search unscheduled tasks..." />
                <CommandList>
                  <CommandEmpty>No unscheduled tasks.</CommandEmpty>
                  <CommandGroup heading="Unscheduled Tasks">
                    {unscheduledTasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        value={task.description || ''}
                        onSelect={() => {
                          onScheduleTask(task.id, block.start);
                          setIsPopoverOpen(false);
                          setSelectedAction(null);
                        }}
                      >
                        {task.description}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};