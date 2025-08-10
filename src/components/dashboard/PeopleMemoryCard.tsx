import React, { useState } from 'react';
import { usePeopleMemory, Person } from '@/hooks/usePeopleMemory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            People Memory
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(null)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-wrap gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-24 rounded-full" />)}
            </div>
          ) : people.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Add people you want to remember to connect with.</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-6">
              {people.map(person => (
                <PersonAvatar
                  key={person.id}
                  person={person}
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                  onUpdateAvatar={uploadAvatar}
                />
              ))}
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