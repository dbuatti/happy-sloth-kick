import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { Habit, NewHabitData, UpdateHabitData } from '@/integrations/supabase/habit-api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import IconPicker from './IconPicker'; // Import the new IconPicker

interface HabitFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewHabitData | UpdateHabitData) => Promise<any>;
  onDelete?: (habitId: string) => Promise<any>;
  initialData?: Habit | null;
  isSaving: boolean;
}

const presetColors = [
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Purple', value: '#a855f7', class: 'bg-purple-500' },
  { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
  { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
  { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500' },
];

const unitOptions = [
  { value: 'none-unit', label: 'None' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'reps', label: 'Reps' },
  { value: 'pages', label: 'Pages' },
  { value: 'times', label: 'Times' },
  { value: 'km', label: 'Kilometers' },
  { value: 'miles', label: 'Miles' },
  { value: 'ml', label: 'Milliliters' },
  { value: 'liters', label: 'Liters' },
  { value: 'glasses', label: 'Glasses' },
  { value: 'steps', label: 'Steps' },
];

const HabitFormDialog: React.FC<HabitFormDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(presetColors[0].value);
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [unit, setUnit] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [isActive, setIsActive] = useState(true);
  const [icon, setIcon] = useState<string | null>(null);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || '');
        setColor(initialData.color);
        setTargetValue(initialData.target_value ?? '');
        setUnit(initialData.unit || null);
        setFrequency(initialData.frequency as 'daily' | 'weekly' | 'monthly');
        setStartDate(parseISO(initialData.start_date));
        setIsActive(initialData.is_active);
        setIcon(initialData.icon || null);
      } else {
        setName('');
        setDescription('');
        setColor(presetColors[0].value);
        setTargetValue('');
        setUnit(null);
        setFrequency('daily');
        setStartDate(new Date());
        setIsActive(true);
        setIcon(null);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const dataToSave: NewHabitData | UpdateHabitData = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      target_value: targetValue === '' ? null : Number(targetValue),
      unit: unit,
      frequency,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      is_active: isActive,
      icon: icon || null,
    };

    await onSave(dataToSave);
    onClose();
  };

  const handleDeleteClick = () => {
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteHabit = async () => {
    if (initialData && onDelete) {
      await onDelete(initialData.id);
      setShowConfirmDeleteDialog(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg rounded-3xl"> {/* Increased roundedness */}
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Habit' : 'Add New Habit'}</DialogTitle>
            <DialogDescription className="sr-only">
              {initialData ? 'Edit the details of your habit.' : 'Fill in the details to add a new habit.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Habit Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Meditate, Drink Water"
                disabled={isSaving}
                autoFocus
                className="h-9 text-base rounded-xl" // Increased roundedness
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why is this habit important? What's your cue?"
                rows={2}
                disabled={isSaving}
                className="text-base rounded-xl" // Increased roundedness
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {presetColors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full border-2 border-transparent transition-all duration-200",
                        c.class,
                        color === c.value && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                      aria-label={c.name}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value as 'daily' | 'weekly' | 'monthly')} disabled={isSaving}>
                  <SelectTrigger className="h-9 text-base rounded-xl"> {/* Increased roundedness */}
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl"> {/* Increased roundedness */}
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <IconPicker
                value={icon}
                onChange={setIcon}
                habitName={name}
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target-value">Target Value (Optional)</Label>
                <Input
                  id="target-value"
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g., 10, 5"
                  min="0"
                  disabled={isSaving}
                  className="h-9 text-base rounded-xl" // Increased roundedness
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit (Optional)</Label>
                <Select
                  value={unit || 'none-unit'}
                  onValueChange={(value) => setUnit(value === 'none-unit' ? null : value)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9 text-base rounded-xl"> {/* Increased roundedness */}
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl"> {/* Increased roundedness */}
                    {unitOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-base rounded-xl", // Increased roundedness
                        !startDate && "text-muted-foreground"
                      )}
                      disabled={isSaving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl"> {/* Increased roundedness */}
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is-active">Status</Label>
                <Select value={isActive ? 'active' : 'inactive'} onValueChange={(value) => setIsActive(value === 'active')} disabled={isSaving}>
                  <SelectTrigger className="h-9 text-base rounded-xl"> {/* Increased roundedness */}
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl"> {/* Increased roundedness */}
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-4">
            {initialData && onDelete && (
              <Button type="button" variant="destructive" onClick={handleDeleteClick} disabled={isSaving} className="w-full sm:w-auto mt-2 sm:mt-0 h-9 text-base rounded-xl"> {/* Increased roundedness */}
                <Trash2 className="mr-2 h-4 w-4" /> Delete Habit
              </Button>
            )}
            <div className="flex space-x-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="flex-1 h-9 text-base rounded-xl"> {/* Increased roundedness */}
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmit} disabled={isSaving || !name.trim()} className="flex-1 h-9 text-base rounded-xl"> {/* Increased roundedness */}
                {isSaving ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Habit')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent className="rounded-3xl"> {/* Increased roundedness */}
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this habit and all its associated logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving} className="rounded-xl">Cancel</AlertDialogCancel> {/* Increased roundedness */}
            <AlertDialogAction onClick={confirmDeleteHabit} disabled={isSaving} className="rounded-xl"> {/* Increased roundedness */}
              {isSaving ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HabitFormDialog;