import { CSS } from '@dnd-kit/utilities';
import { TaskSection } from '@/hooks/useTasks'; // Removed Category, NewTaskData, Task
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GripVertical, Pencil, Trash2 } from 'lucide-react'; // Removed EyeOff, Eye
import { useSortable } from '@dnd-kit/sortable';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface SortableSectionItemProps {
  section: TaskSection;
  onEdit: (sectionId: string, newName: string) => void;
  onDelete: (sectionId: string) => void;
  onToggleIncludeInFocusMode: (sectionId: string, include: boolean) => void;
  isOverlay?: boolean;
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
  section,
  onEdit,
  onDelete,
  onToggleIncludeInFocusMode,
  isOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(section.name);

  const handleSaveEdit = () => {
    if (editedName.trim() && editedName !== section.name) {
      onEdit(section.id, editedName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      setEditedName(section.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 border rounded-md bg-card text-card-foreground shadow-sm",
        isOverlay && "ring-2 ring-primary",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center flex-grow min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab mr-2"
          {...attributes}
          {...listeners}
          aria-label="Drag section"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        {isEditing ? (
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-grow min-w-0"
          />
        ) : (
          <span className="text-sm font-medium truncate flex-grow min-w-0" onDoubleClick={() => setIsEditing(true)}>
            {section.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Checkbox
          checked={section.include_in_focus_mode}
          onCheckedChange={(checked) => onToggleIncludeInFocusMode(section.id, checked as boolean)}
          aria-label="Include in Focus Mode"
          className="mr-2"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit section</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(section.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default SortableSectionItem;