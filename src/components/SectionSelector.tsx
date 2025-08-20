import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, Settings2 } from 'lucide-react';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData, Category, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks';
import ManageSectionsDialog from './ManageSectionsDialog';

interface SectionSelectorProps {
  sections: TaskSection[];
  selectedSectionId: string | null | undefined;
  onSelectSection: (sectionId: string | null) => void;
  createSection: (newSection: NewTaskSectionData) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, updates: UpdateTaskSectionData) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<boolean>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  // Category props are not used here, but might be passed down from parent
  createCategory: (newCategory: NewCategoryData) => Promise<Category | null>;
  updateCategory: (categoryId: string, updates: UpdateCategoryData) => Promise<Category | null>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
}

const SectionSelector: React.FC<SectionSelectorProps> = ({
  sections,
  selectedSectionId,
  onSelectSection,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory, // Passed through to ManageSectionsDialog
  updateCategory, // Passed through to ManageSectionsDialog
  deleteCategory, // Passed through to ManageSectionsDialog
}) => {
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const currentSectionName = selectedSectionId
    ? sections.find(s => s.id === selectedSectionId)?.name || 'Unknown Section'
    : 'No Section';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>{currentSectionName}</span>
            <Settings2 className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <DropdownMenuItem onSelect={() => onSelectSection(null)}>
            No Section
          </DropdownMenuItem>
          {sections.map(section => (
            <DropdownMenuItem key={section.id} onSelect={() => onSelectSection(section.id)}>
              {section.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => setIsManageSectionsOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Manage Sections
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />
    </>
  );
};

export default SectionSelector;