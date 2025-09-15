import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Button } from '@/components/ui/button';
import { Plus, UploadCloud, X, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PersonAvatar from './PersonAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { usePeopleMemory, Person } from '@/hooks/usePeopleMemory';

const PeopleMemoryCard: React.FC = () => {
  const { people, loading, addPerson, updatePerson, deletePerson } = usePeopleMemory();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null); // New state for the actual File object
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isFormOpen) {
      setName(editingPerson?.name || '');
      setNotes(editingPerson?.notes || '');
      setCurrentImageFile(null); // Clear file input on open
      setImagePreview(editingPerson?.avatar_url || null);
    }
  }, [isFormOpen, editingPerson]);

  const handleOpenForm = (person: Person | null) => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPerson(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    if (editingPerson) {
      await updatePerson({ id: editingPerson.id, updates: { name, notes, avatar_url: currentImageFile ? undefined : imagePreview }, avatarFile: currentImageFile });
    } else {
      await addPerson({ personData: { name, notes }, avatarFile: currentImageFile });
    }
    setIsSaving(false);
    handleCloseForm();
  };

  const handleDeleteClick = (id: string) => {
    setPersonToDelete(id);
  };

  const confirmDelete = async () => {
    if (personToDelete) {
      await deletePerson(personToDelete);
      setPersonToDelete(null);
    }
  };

  const handleFile = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setCurrentImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else if (file) {
      showError('Please upload a valid image file.');
    }
  };

  const handleRemoveImage = () => {
    setCurrentImageFile(null);
    setImagePreview(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
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
    <>
      <Card className="h-full shadow-lg rounded-xl"> {/* Changed from fieldset to Card */}
        <CardHeader className="pb-2"> {/* Adjusted padding */}
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2"> {/* Adjusted font size and alignment */}
            <Users className="h-5 w-5 text-primary" /> People Memory
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center pt-0"> {/* Adjusted padding */}
          {loading ? (
            <div className="flex flex-wrap items-center gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-20 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4">
              {people.map(person => (
                <PersonAvatar
                  key={person.id}
                  person={person}
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                  onUpdateAvatar={async (id, file) => { await updatePerson({ id, updates: {}, avatarFile: file }); }}
                />
              ))}
              <Button variant="outline" className="h-20 w-20 rounded-full flex-shrink-0" onClick={() => handleOpenForm(null)}>
                <Plus className="h-10 w-10" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Edit Person' : 'Add Person'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg p-4 text-center transition-colors h-32 flex items-center justify-center",
                isDragging ? "border-primary bg-primary/10" : "border-border"
              )}
              onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Avatar preview" className="rounded-full h-24 w-24 object-cover" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={handleRemoveImage}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <UploadCloud className="h-8 w-8" />
                  <p className="text-sm">Drag & drop an image here, or <label htmlFor="avatar-upload" className="text-primary underline cursor-pointer">click to upload</label>.</p>
                  <Input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                </div>
              )}
            </div>
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Doe" />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Met at the conference, follow up about project X." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!personToDelete} onOpenChange={() => setPersonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this person from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PeopleMemoryCard;