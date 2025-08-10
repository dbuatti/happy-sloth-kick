import React, { useState } from 'react';
import { Person } from '@/hooks/usePeopleMemory';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonAvatarProps {
  person: Person;
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onUpdateAvatar: (id: string, file: File) => void;
}

const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, onEdit, onDelete, onUpdateAvatar }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpdateAvatar(person.id, e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div className="relative flex flex-col items-center gap-2 group">
      <div
        className={cn(
          "relative rounded-full transition-all duration-200",
          isDragging && "ring-2 ring-primary ring-offset-2"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <Avatar className="h-20 w-20 border-2 border-muted">
          <AvatarImage src={person.avatar_url || undefined} alt={person.name} />
          <AvatarFallback className="text-2xl">
            {person.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        {isDragging && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <UploadCloud className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-center truncate w-24">{person.name}</p>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => onEdit(person)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(person.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default PersonAvatar;