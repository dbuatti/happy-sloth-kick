"use client";

import { TaskSection } from "@/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, EyeOff, Trash2, Edit } from 'lucide-react';

interface SectionHeaderProps {
  section: TaskSection;
  taskCount: number;
  onEdit: (section: TaskSection) => void;
  onDelete: (sectionId: string) => void;
  onToggleFocusMode: (sectionId: string, include: boolean) => void;
}

export function SectionHeader({
  section,
  taskCount,
  onEdit,
  onDelete,
  onToggleFocusMode,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold">{section.name} ({taskCount})</h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(section)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Section
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleFocusMode(section.id, !section.include_in_focus_mode)}>
            {section.include_in_focus_mode ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" /> Exclude from Focus Mode
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" /> Include in Focus Mode
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(section.id)} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Section
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}