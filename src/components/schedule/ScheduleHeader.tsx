import React, { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, X, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DateNavigator from '@/components/DateNavigator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/hooks/useAppointments';
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
import { useSettings } from '@/context/SettingsContext';
import ScheduleSettingsDialog from './ScheduleSettingsDialog';

interface ScheduleHeaderProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  onClearDay: (date: Date) => Promise<void>;
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  isDemo?: boolean;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  currentDate,
  setCurrentDate,
  onClearDay,
  onAddAppointment,
  isDemo,
}) => {
  const [isParseDialogOpen, setIsParseDialogOpen] = useState(false);
  const [parseText, setParseText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showClearDayConfirm, setShowClearDayConfirm] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, updateSettings } = useSettings();

  const handleParseText = async () => {
    if (!parseText.trim()) {
      toast.error('Please enter text to parse.');
      return;
    }
    setIsParsing(true);
    try {
      const todayDateString = format(currentDate, 'yyyy-MM-dd');
      const { data, error } = await supabase.functions.invoke('parse-appointment-text', {
        body: { text: parseText, currentDate: todayDateString },
      });

      if (error) {
        throw new Error(error.message);
      }

      const parsedAppointment = data as {
        title: string;
        description: string | null;
        date: string;
        startTime: string;
        endTime: string;
      };

      if (!parsedAppointment.title || !parsedAppointment.date || !parsedAppointment.startTime || !parsedAppointment.endTime) {
        toast.error('Could not parse all required appointment details. Please try again with more specific text.');
        return;
      }

      await onAddAppointment({
        title: parsedAppointment.title,
        description: parsedAppointment.description,
        date: parsedAppointment.date,
        start_time: parsedAppointment.startTime + ':00',
        end_time: parsedAppointment.endTime + ':00',
        color: '#3b82f6', // Default color
        task_id: null,
      });

      toast.success('Appointment parsed and added!');
      setParseText('');
      setIsParseDialogOpen(false);
    } catch (error: any) {
      console.error('Error parsing appointment text:', error);
      toast.error(`Failed to parse appointment: ${error.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h2 className="text-3xl font-bold">Daily Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Schedule Settings"
            className="h-9 w-9"
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
          <DateNavigator
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onPreviousDay={() => setCurrentDate(prev => addDays(prev, -1))}
            onNextDay={() => setCurrentDate(prev => addDays(prev, 1))}
            onGoToToday={() => setCurrentDate(new Date())}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          onClick={() => setShowClearDayConfirm(true)}
          disabled={isDemo}
          className="h-9"
        >
          <X className="mr-2 h-4 w-4" /> Clear Day
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsParseDialogOpen(true)}
          disabled={isDemo}
          className="h-9"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Parse from Text
        </Button>
      </div>

      <Dialog open={isParseDialogOpen} onOpenChange={setIsParseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parse Appointment from Text</DialogTitle>
            <DialogDescription>
              Enter a natural language description of your appointment. AI will extract the details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="parse-text">Appointment Description</Label>
              <Textarea
                id="parse-text"
                value={parseText}
                onChange={(e) => setParseText(e.target.value)}
                placeholder="e.g., 'Meeting with John tomorrow at 3pm for 1 hour about project X'"
                rows={4}
                disabled={isParsing || isDemo}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsParseDialogOpen(false)} disabled={isParsing || isDemo}>Cancel</Button>
            <Button onClick={handleParseText} disabled={isParsing || !parseText.trim() || isDemo}>
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsing...
                </>
              ) : (
                'Parse & Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showClearDayConfirm} onOpenChange={setShowClearDayConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to clear all appointments for this day?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All appointments for {format(currentDate, 'PPP')} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDemo}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onClearDay(currentDate)} disabled={isDemo}>
              Clear Day
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={updateSettings}
        isDemo={isDemo}
      />
    </div>
  );
};

export default ScheduleHeader;