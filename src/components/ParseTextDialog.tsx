import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from 'lucide-react';

interface ParseTextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  textToParse: string;
  setTextToParse: (text: string) => void;
  onParse: () => Promise<void>;
  isParsing: boolean;
}

const ParseTextDialog: React.FC<ParseTextDialogProps> = ({
  isOpen,
  onClose,
  textToParse,
  setTextToParse,
  onParse,
  isParsing,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Parse Appointment from Text</DialogTitle>
          <DialogDescription>
            Paste any text containing appointment details, and our AI will try to extract them.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Paste appointment details here (e.g., 'Meeting with John tomorrow at 10am for 1 hour about project X')"
            value={textToParse}
            onChange={(e) => setTextToParse(e.target.value)}
            rows={6}
            disabled={isParsing}
            className="text-base"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isParsing}>Cancel</Button>
          <Button onClick={onParse} disabled={isParsing || !textToParse.trim()}>
            {isParsing ? (
              <span className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full mr-2" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isParsing ? 'Parsing...' : 'Parse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ParseTextDialog;