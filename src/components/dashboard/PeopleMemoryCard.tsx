import React, { useState } from 'react';
import { usePeopleMemory, Person } from '@/hooks/usePeopleMemory';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PersonAvatar from './PersonAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PeopleMemoryCard: React.FC = () => {
  const { people, loading, addPerson, updatePerson, deletePerson, uploadAvatar } = usePeopleMemory();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

  const handleOpenForm = (person: Person | null) => {
    setEditingPerson(person);
    setName(person?.name || '');
    setNotes(person?.notes || '');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPerson(null);
    setName('');
    setNotes('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    if (editingPerson) {
      await updatePerson(editingPerson.id, { name, notes });
    } else {
      await addPerson({ name, notes });
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

  return (
    <>
      <fieldset className="rounded-xl border-2 border-border p-3">
        <legend className="px-2 text-sm text-muted-foreground -ml-1 font-medium">People Memory</legend>
        <div className="flex items-center gap-3 min-h-[40px]">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))
          ) : (
            <>
              {people.map(person => (
                <PersonAvatar
                  key={person.id}
                  person={person}
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                  onUpdateAvatar={uploadAvatar}
                />
              ))}
              <Button variant="outline" className="h-10 w-10 rounded-full flex-shrink-0" onClick={() => handleOpenForm(null)}>
                <Plus className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </fieldset>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Edit Person' : 'Add Person'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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