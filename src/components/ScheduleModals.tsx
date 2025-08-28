import React from 'react';
import { createPortal } from 'react-dom';
import { format, setHours } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import AppointmentForm from '@/components/AppointmentForm';
import { Appointment, NewAppointmentData } from '@/hooks/useAppointments';

interface ScheduleModalsProps {
  // Appointment Form
  isAppointmentFormOpen: boolean;
  setIsAppointmentFormOpen: (isOpen: boolean) => void;
  editingAppointment: Appointment | null;
  setEditingAppointment: (app: Appointment | null) => void;
  selectedTimeSlotForNew: { start: Date; end: Date } | null;
  setSelectedTimeSlotForNew: (slot: { start: Date; end: Date } | null) => void;
  selectedDateForNew: Date;
  // setSelectedDateForNew: (date: Date) => void; // Removed
  handleSaveAppointment: (data: NewAppointmentData) => Promise<Appointment | null | boolean>;
  handleDeleteAppointment: (id: string) => Promise<boolean>;
  parsedDataForForm: Partial<NewAppointmentData> | null;
  setParsedDataForForm: (data: Partial<NewAppointmentData> | null) => void;
  setPendingAppointmentData: (data: NewAppointmentData | null) => void;

  // Parsing Dialog
  isParsingDialogOpen: boolean;
  setIsParsingDialogOpen: (isOpen: boolean) => void;
  textToParse: string;
  setTextToParse: (text: string) => void;
  isParsing: boolean;
  handleParseText: () => Promise<void>;

  // Clear Day Dialog
  isClearDayDialogOpen: boolean;
  setIsClearDayDialogOpen: (isOpen: boolean) => void;
  dayToClear: Date | null;
  // setDayToClear: (date: Date | null) => void; // Removed
  handleClearDay: () => Promise<void>;

  // Extend Hours Dialog
  isExtendHoursDialogOpen: boolean;
  setIsExtendHoursDialogOpen: (isOpen: boolean) => void;
  newHoursToExtend: { min: number; max: number } | null;
  setNewHoursToExtend: (hours: { min: number; max: number } | null) => void;
  confirmExtendHours: () => Promise<void>;
}

const ScheduleModals: React.FC<ScheduleModalsProps> = ({
  isAppointmentFormOpen, setIsAppointmentFormOpen, editingAppointment, setEditingAppointment,
  selectedTimeSlotForNew, setSelectedTimeSlotForNew, selectedDateForNew, // Removed setSelectedDateForNew
  handleSaveAppointment, handleDeleteAppointment, parsedDataForForm, setParsedDataForForm, setPendingAppointmentData,

  isParsingDialogOpen, setIsParsingDialogOpen, textToParse, setTextToParse, isParsing, handleParseText,

  isClearDayDialogOpen, setIsClearDayDialogOpen, dayToClear, // Removed setDayToClear
  handleClearDay,

  isExtendHoursDialogOpen, setIsExtendHoursDialogOpen, newHoursToExtend, setNewHoursToExtend, confirmExtendHours,
}) => {
  return (
    <>
      <AppointmentForm
        isOpen={isAppointmentFormOpen}
        onClose={() => {
          setIsAppointmentFormOpen(false);
          setEditingAppointment(null);
          setSelectedTimeSlotForNew(null);
          setParsedDataForForm(null);
          setPendingAppointmentData(null);
        }}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        initialData={editingAppointment}
        selectedDate={selectedDateForNew}
        selectedTimeSlot={selectedTimeSlotForNew}
        prefilledData={parsedDataForForm}
      />
      <Dialog open={isParsingDialogOpen} onOpenChange={setIsParsingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parse Appointment from Text</DialogTitle>
            <DialogDescription>
              Paste your appointment details below (e.g., "meeting at 3pm for 1 hour" or a confirmation email) and we'll try to fill out the form for you.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="text-to-parse">Appointment Text</Label>
            <Textarea
              id="text-to-parse"
              value={textToParse}
              onChange={(e) => setTextToParse(e.target.value)}
              rows={10}
              placeholder="Paste text here..."
              disabled={isParsing}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsParsingDialogOpen(false)} disabled={isParsing}>Cancel</Button>
            <Button onClick={handleParseText} disabled={isParsing || !textToParse.trim()}>
              {isParsing ? 'Parsing...' : 'Parse and Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {createPortal(
        <AlertDialog open={isClearDayDialogOpen} onOpenChange={setIsClearDayDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to clear the day?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will remove all appointments for {dayToClear ? format(dayToClear, 'MMMM d, yyyy') : 'the selected day'}. This cannot be undone immediately, but you can undo it from the toast notification.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearDay}>Clear Day</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
        document.body
      )}
      {createPortal(
        <AlertDialog open={isExtendHoursDialogOpen} onOpenChange={setIsExtendHoursDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Extend Work Hours?</AlertDialogTitle>
              <AlertDialogDescription>
                This appointment falls outside your current work hours for {format(selectedDateForNew, 'EEEE, MMM d')}. Would you like to extend your work hours to {newHoursToExtend ? `${format(setHours(selectedDateForNew, newHoursToExtend.min), 'h a')} - ${format(setHours(selectedDateForNew, newHoursToExtend.max), 'h a')}` : 'fit it'}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setIsExtendHoursDialogOpen(false);
                setNewHoursToExtend(null);
                setPendingAppointmentData(null);
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmExtendHours}>Extend Hours</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
        document.body
      )}
    </>
  );
};

export default ScheduleModals;