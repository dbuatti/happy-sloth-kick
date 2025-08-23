import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PersonAvatar from './PersonAvatar';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { Person, NewPersonData, UpdatePersonData, PeopleMemoryCardProps } from '@/types';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { DialogTrigger } from '@radix-ui/react-dialog';

const PeopleMemoryCard: React.FC<PeopleMemoryCardProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { people, isLoading, error, addPerson, updatePerson, deletePerson } = usePeopleMemory({ userId: currentUserId });

  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');

  const [isEditPersonDialogOpen, setIsEditPersonDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonNotes, setEditPersonNotes] = useState('');

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      toast.error('Person name cannot be empty.');
      return;
    }
    try {
      await addPerson({ name: newPersonName, notes: newPersonNotes });
      setNewPersonName('');
      setNewPersonNotes('');
      setIsAddPersonDialogOpen(false);
    } catch (err) {
      toast.error('Failed to add person.');
      console.error('Error adding person:', err);
    }
  };

  const handleUpdatePerson = async () => {
    if (!editingPerson || !editPersonName.trim()) {
      toast.error('Person name cannot be empty.');
      return;
    }
    try {
      await updatePerson({ id: editingPerson.id, updates: { name: editPersonName, notes: editPersonNotes } });
      setIsEditPersonDialogOpen(false);
      setEditingPerson(null);
    } catch (err) {
      toast.error('Failed to update person.');
      console.error('Error updating person:', err);
    }
  };

  const handleUpdatePersonAvatar = async (id: string, url: string | null) => {
    try {
      await updatePerson({ id, updates: { avatar_url: url } });
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Failed to update avatar.');
      console.error('Error updating avatar:', err);
    }
  };

  const openEditDialog = (person: Person) => {
    setEditingPerson(person);
    setEditPersonName(person.name);
    setEditPersonNotes(person.notes || '');
    setIsEditPersonDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>People Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading people...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>People Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading people: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">People Memory</CardTitle>
        <Dialog open={isAddPersonDialogOpen} onOpenChange={setIsAddPersonDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Person
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Person</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Input id="notes" value={newPersonNotes} onChange={(e) => setNewPersonNotes(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddPerson}>Add Person</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {people && people.length === 0 ? (
          <p className="text-muted-foreground">No people added to memory yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {people && people.map((person) => (
              <div key={person.id} className="flex flex-col items-center text-center p-2">
                <PersonAvatar
                  person={person}
                  onEdit={openEditDialog}
                  onDelete={deletePerson}
                  onUpdateAvatar={handleUpdatePersonAvatar}
                />
                <p className="text-sm font-medium mt-2">{person.name}</p>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isEditPersonDialogOpen} onOpenChange={setIsEditPersonDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit {editingPerson?.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input id="edit-name" value={editPersonName} onChange={(e) => setEditPersonName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-notes" className="text-right">Notes</Label>
                <Input id="edit-notes" value={editPersonNotes} onChange={(e) => setEditPersonNotes(e.target.value)} className="col-span-3" />
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