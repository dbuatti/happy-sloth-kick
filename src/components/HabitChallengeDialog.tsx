import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
            <Sparkles className="h-5 w-5 text-primary" /> Habit Challenge Suggestion
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {suggestion ? (
            <p className="text-lg text-muted-foreground">{suggestion}</p>
          ) : (
            <p className="text-muted-foreground">No challenge suggestion available at the moment.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Got It!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HabitChallengeDialog;