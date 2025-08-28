import React from 'react';
import { format } from 'date-fns'; // Removed parseISO, isValid
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { WorkHour } from '@/hooks/useWorkHours';
import AppointmentForm from './AppointmentForm';
import ParseTextDialog from './ParseTextDialog';
import ClearDayDialog from './ClearDayDialog';
import ExtendHoursDialog from './ExtendHoursDialog';

interface ScheduleModalsProps {
  isAppointmentFormOpen: boolean;
  setIsAppointmentFormOpen: (isOpen: boolean) => void;
  editingAppointment: Appointment | null;
  setEditingAppointment: (appointment: Appointment | null) => void;
  selectedTimeSlotForNew: { start: Date; end: Date } | null;
  setSelectedTimeSlotForNew: (slot: { start: Date; end: Date } | null) => void;
  selectedDateForNew: Date;
  // setSelectedDateForNew: (date: Date) => void; // Removed as it's not used directly in ScheduleModals
  handleSaveAppointment: (data: NewAppointmentData) => Promise<Appointment | null | false>;
  handleDeleteAppointment: (id: string) => Promise<boolean>;
  parsedDataForForm: Partial<NewAppointmentData> | null;
  setParsedDataForForm: (data: Partial<NewAppointmentData> | null) => void;
  setPendingAppointmentData: (data: NewAppointmentData | null) => void;

  isParsingDialogOpen: boolean;
  setIsParsingDialogOpen: (isOpen: boolean) => void;
  textToParse: string;
  setTextToParse: (text: string) => void;
  isParsing: boolean;
  handleParseText: () => Promise<void>;

  isClearDayDialogOpen: boolean;
  setIsClearDayDialogOpen: (isOpen: boolean) => void;
  dayToClear: Date | null;
  // setDayToClear: (date: Date | null) => void; // Removed as it's not used directly in ScheduleModals
  handleClearDay: () => Promise<void>;

  isExtendHoursDialogOpen: boolean;
  setIsExtendHoursDialogOpen: (isOpen: boolean) => void;
  newHoursToExtend: { min: number; max: number } | null;
  setNewHoursToExtend: (hours: { min: number; max: number } | null) => void;
  confirmExtendHours: () => Promise<void>;
}

const ScheduleModals: React.FC<ScheduleModalsProps> = ({
  isAppointmentFormOpen,
  setIsAppointmentFormOpen,
  editingAppointment,
  setEditingAppointment,
  selectedTimeSlotForNew,
  setSelectedTimeSlotForNew,
  selectedDateForNew,
  // setSelectedDateForNew, // Removed
  handleSaveAppointment,
  handleDeleteAppointment,
  parsedDataForForm,
  setParsedDataForForm,
  setPendingAppointmentData,

  isParsingDialogOpen,
  setIsParsingDialogOpen,
  textToParse,
  setTextToParse,
  isParsing,
  handleParseText,

  isClearDayDialogOpen,
  setIsClearDayDialogOpen,
  dayToClear,
  // setDayToClear, // Removed
  handleClearDay,

  isExtendHoursDialogOpen,
  setIsExtendHoursDialogOpen,
  newHoursToExtend,
  setNewHoursToExtend,
  confirmExtendHours,
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
        initialAppointment={editingAppointment}
        initialTimeSlot={selectedTimeSlotForNew}
        initialDate={selectedDateForNew}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        parsedData={parsedDataForForm}
      />

      <ParseTextDialog
        isOpen={isParsingDialogOpen}
        onClose={() => setIsParsingDialogOpen(false)}
        textToParse={textToParse}
        setTextToParse={setTextToParse}
        onParse={handleParseText}
        isParsing={isParsing}
      />

      <ClearDayDialog
        isOpen={isClearDayDialogOpen}
        onClose={() => setIsClearDayDialogOpen(false)}
        onConfirm={handleClearDay}
        dayToClear={dayToClear}
      />

      <ExtendHoursDialog
        isOpen={isExtendHoursDialogOpen}
        onClose={() => {
          setIsExtendHoursDialogOpen(false);
          setNewHoursToExtend(null);
          setPendingAppointmentData(null);
        }}
        onConfirm={confirmExtendHours}
        newHoursToExtend={newHoursToExtend}
      />
    </>
  );
};

export default ScheduleModals;