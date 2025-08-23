import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { Person, NewPersonData, UpdatePersonData, PersonAvatarProps } from '@/types';
import { toast } from 'react-hot-toast';
import PersonAvatar from './PersonAvatar';

interface PeopleMemoryCardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const PeopleMemoryCard: React.FC<PeopleMemoryCardProps> = ({ isDemo = false, demoUserId }) => {
  const { people, isLoading, error, addPerson, updatePerson, deletePerson } = usePeopleMemory();
  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);
  const [isEditPersonDialogOpen, setIsEditPersonDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonNotes, setEditPersonNotes] = useState('');

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      toast.error('Person name cannot be empty.');
      return;
    }
    try {
      await addPerson({ name: newPersonName.trim(), notes: newPersonNotes.trim() || null });
      setNewPersonName('');
      setNewPersonNotes('');
      setIsAddPersonDialogOpen(false);
    } catch (err) {
      toast.error('Failed to add person.');
      console.error(err);
    }
  };

  const handleUpdatePerson = async () => {
    if (!editingPerson) return;
    if (!editPersonName.trim()) {
      toast.error('Person name cannot be empty.');
      return;
    }
    try {
      await updatePerson({ id: editingPerson.id, updates: { name: editPersonName.trim(), notes: editPersonNotes.trim() || null } });
      setIsEditPersonDialogOpen(false);
      setEditingPerson(null);
    } catch (err) {
      toast.error('Failed to update person.');
      console.error(err);
    }
  };

  const handleDeletePerson = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this person from your memory?')) {
      try {
        await deletePerson(id);
      } catch (err) {
        toast.error('Failed to delete person.');
        console.error(err);
      }
    }
  };

  if (isLoading) return <Card><CardContent><p>Loading people memory...</p></CardContent></Card>;
  if (error) return <Card><CardContent><p>Error: {error.message}</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">People Memory</CardTitle>
        <Dialog open={isAddPersonDialogOpen} onOpenChange={setIsAddPersonDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Person</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Input id="notes" value={newPersonNotes} onChange={(e) => setNewPersonNotes(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setIsAddPersonDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddPerson}>Add Person</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {people && people.length === 0 ? (
          <p className="text-sm text-muted-foreground">No people added yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {people?.map((person) => (
              <div key={person.id} className="flex flex-col items-center text-center p-2">
                <PersonAvatar
                  person={person}
                  onEdit={(p) => {
                    setEditingPerson(p);
                    setEditPersonName(p.name);
                    setEditPersonNotes(p.notes || '');
                    setIsEditPersonDialogOpen(true);
                  }}
                  onDelete={handleDeletePerson}
                />
                <p className="text-sm font-medium mt-2">{person.name}</p>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isEditPersonDialogOpen} onOpenChange={setIsEditPersonDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Person</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editName" className="text-right">
                  Name
                </Label>
                <Input id="editName" value={editPersonName} onChange={(e) => setEditPersonName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editNotes" className="text-right">
                  Notes
                </Label>
                <Input id="editNotes" value={editPersonNotes} onChange={(e) => setEditPersonNotes(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setIsEditPersonDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdatePerson}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PeopleMemoryCard;