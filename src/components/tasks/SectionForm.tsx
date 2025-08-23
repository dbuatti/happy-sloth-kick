import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { TaskSection } from '@/types/task-management';

interface SectionFormProps {
  initialSection?: TaskSection | null;
  onSave: (section: Partial<TaskSection>) => void;
  onClose: () => void;
}

const SectionForm: React.FC<SectionFormProps> = ({ initialSection, onSave, onClose }) => {
  const [name, setName] = useState(initialSection?.name || '');
  const [includeInFocusMode, setIncludeInFocusMode] = useState(initialSection?.include_in_focus_mode ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    onSave({ ...initialSection, name, include_in_focus_mode: includeInFocusMode });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Section Name
        </label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Section name" className="mt-1" />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeInFocusMode"
          checked={includeInFocusMode}
          onCheckedChange={(checked) => setIncludeInFocusMode(checked as boolean)}
        />
        <label htmlFor="includeInFocusMode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Include in Focus Mode
        </label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Tasks in sections included in Focus Mode will appear in your daily focus view.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Section</Button>
      </DialogFooter>
    </form>
  );
};

export default SectionForm;