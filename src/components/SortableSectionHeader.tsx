import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TaskSection, SortableSectionHeaderProps } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'react-hot-toast';

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({
  id,
  section,
  onUpdateSectionName,
  onDeleteSection,
  onToggleIncludeInFocusMode,
  isDragging: propIsDragging,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(section.name);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const handleSaveName = async () => {
    if (editedName.trim() === '') {
      toast.error('Section name cannot be empty.');
      return;
    }
    try {
      await onUpdateSectionName(section.id, editedName);
      setIsEditing(false);
      toast.success('Section name updated!');
    } catch (error) {
      toast.error('Failed to update section name.');
      console.error('Error updating section name:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await onDeleteSection(section.id);
      toast.success('Section deleted!');
    } catch (error) {
      toast.error('Failed to delete section.');
      console.error('Error deleting section:', error);
    }
  };

  const handleToggleFocusMode = async () => {
    try {
      await onToggleIncludeInFocusMode(section.id, !(section.include_in_focus_mode ?? true));
      toast.success(`Section ${section.include_in_focus_mode ? 'removed from' : 'added to'} focus mode!`);
    } catch (error) {
      toast.error('Failed to update focus mode setting.');
      console.error('Error toggling focus mode setting:', error);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 bg-secondary text-secondary-foreground rounded-md shadow-sm mb-2",
        (propIsDragging || isDragging) && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center flex-grow">
        <Button variant="ghost" size="icon" className="mr-2 cursor-grab" {...listeners} {...attributes}>
          <GripVertical className="h-4 w-4" />
        </Button>
        {isEditing ? (
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveName();
              }
              if (e.key === 'Escape') {
                setEditedName(section.name);
                setIsEditing(false);
              }
            }}
            className="flex-grow"
          />
        ) : (
          <h3 className="text-lg font-semibold flex-grow" onDoubleClick={() => setIsEditing(true)}>
            {section.name}
          </h3>
        )}
      </div>
      <div className="flex items-center space-x-1">
        {isEditing && (
          <Button variant="ghost" size="icon" onClick={handleSaveName}>
            <Save className="h-4 w-4" />
          </Button>
        )}
        {!isEditing && (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={handleToggleFocusMode}>
          {section.include_in_focus_mode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setIsConfirmDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the "{section.name}" section and all tasks within it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SortableSectionHeader;