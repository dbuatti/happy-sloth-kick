import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';

interface HabitChallengeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: string | null;
}

const HabitChallengeDialog: React.FC<HabitChallengeDialogProps> = ({ isOpen, onClose, suggestion }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Challenge Suggestion
          </DialogTitle>
          <DialogDescription>
            Here's a personalized suggestion to help you grow with this habit.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {suggestion ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{suggestion}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No suggestion available at the moment.</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Got It!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HabitChallengeDialog;