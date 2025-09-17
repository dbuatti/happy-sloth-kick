import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from 'lucide-react';

interface HabitSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: string | null;
  isLoading: boolean;
}

const HabitSuggestionDialog: React.FC<HabitSuggestionDialogProps> = ({ isOpen, onClose, suggestion, isLoading }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Habit Suggestion
          </DialogTitle>
          <DialogDescription>
            Here's a personalized suggestion to help you with your habits.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <p className="text-sm text-muted-foreground">Generating suggestion...</p>
            </div>
          ) : suggestion ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{suggestion}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No suggestion available at the moment. Click 'Get Suggestion' to try again!</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Got It!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HabitSuggestionDialog;