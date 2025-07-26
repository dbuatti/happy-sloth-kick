import React, { useState, useEffect, FC } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, FolderOpen } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

interface SectionSelectorProps {
  value: string | null;
  onChange: (sectionId: string | null) => void;
  userId: string | null;
}

const SectionSelector: FC<SectionSelectorProps> = ({ value, onChange, userId }) => {
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  useEffect(() => {
    if (userId) {
      fetchSections();
    }
  }, [userId]);

  useEffect(() => {
    // If no section is selected and sections exist, default to the first one
    if (!value && sections.length > 0) {
      onChange(sections[0].id);
    }
  }, [value, sections, onChange]);

  const fetchSections = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      showError('Failed to fetch sections');
      console.error('Error fetching sections:', error);
    }
  };

  const createSection = async () => {
    if (!newSectionName.trim()) {
      showError('Section name is required');
      return;
    }
    if (!userId) {
      showError("User not authenticated. Cannot create section.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert([
          { name: newSectionName, user_id: userId }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setSections([...sections, data]);
      setNewSectionName('');
      showSuccess('Section created successfully');
      // Automatically select the newly created section if it's the first one
      if (sections.length === 0) {
        onChange(data.id);
      }
    } catch (error: any) {
      showError('Failed to create section');
      console.error('Error creating section:', error);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!userId) {
      showError("User not authenticated. Cannot delete section.");
      return;
    }
    if (sections.length === 1 && sections[0].id === sectionId) {
      showError("Cannot delete the last section. Please create another section first or delete all tasks in this section.");
      return;
    }

    const tasksInSection = await supabase
      .from('tasks')
      .select('id')
      .eq('section_id', sectionId)
      .eq('user_id', userId);

    if (tasksInSection.data && tasksInSection.data.length > 0) {
      // If there are tasks, prompt for reassignment
      const otherSections = sections.filter(s => s.id !== sectionId);
      if (otherSections.length === 0) {
        showError("Cannot delete this section as it contains tasks and no other sections exist to reassign them to. Please create another section first.");
        return;
      }
      const targetSection = otherSections[0]; // Default to the first available other section
      if (window.confirm(`This section contains ${tasksInSection.data.length} tasks. They will be moved to "${targetSection.name}". Are you sure you want to delete this section?`)) {
        await supabase
          .from('tasks')
          .update({ section_id: targetSection.id })
          .eq('section_id', sectionId)
          .eq('user_id', userId);
      } else {
        return; // User cancelled
      }
    }

    try {
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);

      if (error) throw error;
      
      setSections(sections.filter(sec => sec.id !== sectionId));
      if (value === sectionId) {
        onChange(sections.length > 1 ? sections.filter(s => s.id !== sectionId)[0].id : null); // Select another section or null if none left
      }
      showSuccess('Section deleted successfully');
    } catch (error: any) {
      showError('Failed to delete section');
      console.error('Error deleting section:', error);
    }
  };

  const selectedSection = sections.find(sec => sec.id === value);

  return (
    <div className="space-y-2">
      <Label>Section</Label>
      <div className="flex space-x-2">
        <div className="flex-1">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          >
            {sections.length === 0 ? (
              <option value="" disabled>No sections available</option>
            ) : (
              sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))
            )}
          </select>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Sections</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="section-name">New Section Name</Label>
                <Input
                  id="section-name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g., Work, Personal, Groceries"
                />
              </div>
              <Button onClick={createSection} className="w-full">Create Section</Button>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Existing Sections</h3>
                {sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sections created yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {sections.map(section => (
                      <li key={section.id} className="flex items-center justify-between p-2 border rounded-md">
                        <span className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          {section.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteSection(section.id)}
                          aria-label={`Delete section ${section.name}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedSection && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <FolderOpen className="h-3 w-3" />
          <span>{selectedSection.name}</span>
        </div>
      )}
    </div>
  );
};

export default SectionSelector;