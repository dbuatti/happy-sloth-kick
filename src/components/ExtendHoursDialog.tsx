import React from 'react';
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
import { format } from 'date-fns';

interface ExtendHoursDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  newHoursToExtend: { min: number; max: number } | null;
}

const ExtendHoursDialog: React.FC<ExtendHoursDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  newHoursToExtend,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Extend Work Hours?</AlertDialogTitle>
          <AlertDialogDescription>
            The appointment you are trying to save falls outside your current defined work hours.
            Would you like to extend your work hours to cover the range from{' '}
            <span className="font-semibold">{newHoursToExtend ? format(setHours(new Date(), newHoursToExtend.min), 'h a') : ''}</span> to{' '}
            <span className="font-semibold">{newHoursToExtend ? format(setHours(new Date(), newHoursToExtend.max), 'h a') : ''}</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Extend Hours</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ExtendHoursDialog;