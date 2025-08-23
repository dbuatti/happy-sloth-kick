import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, User, ImageOff, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { Person, NewPersonData, UpdatePersonData } from '@/types';
import { toast } from 'react-hot-toast';
import { Textarea } from '@/components/ui/textarea';

const PeopleMemoryCard: React.FC = () => {
  const { people, isLoading, error, addPerson, updatePerson, deletePerson } = usePeopleMemory();

  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');
  const [newPersonAvatarUrl, setNewPersonAvatarUrl] = useState('');

  const [isEditPersonDialogOpen, setIsEditPersonDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonNotes, setEditPersonNotes] = useState('');
  const [editPersonAvatarUrl, setEditPersonAvatarUrl] = useState('');

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      toast.error('Person name cannot be empty.');
      return;
    }
    try {
      const newPersonData: NewPersonData = {
        name: newPersonName.trim(),
        notes: newPersonNotes.trim() || null,
        avatar_url: newPersonAvatarUrl.trim() || null,
      };
      await addPerson(newPersonData);
      toast.success('Person added successfully!');
      setNewPersonName('');
      setNewPersonNotes('');
      setNewPersonAvatarUrl('');
      setIsAddPersonDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to add person: ${(err as Error).message}`);
      console.error('Error adding person:', err);
    }
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setEditPersonName(person.name);
    setEditPersonNotes(person.notes || '');
    setEditPersonAvatarUrl(person.avatar_url || '');
    setIsEditPersonDialogOpen(true);
  };

  const handleUpdatePerson = async () => {
    if (!editingPerson || !editPersonName.trim()) {
      toast.error('Person name cannot be empty.');
      return;
    }
    try {
      const updates: UpdatePersonData = {
        name: editPersonName.trim(),
        notes: editPersonNotes.trim() || null,
        avatar_url: editPersonAvatarUrl.trim() || null,
      };
      await updatePerson({ id: editingPerson.id, updates });
      toast.success('Person updated successfully!');
      setIsEditPersonDialogOpen(false);
      setEditingPerson(null);
    } catch (err) {
      toast.error(`Failed to update person: ${(err as Error).message}`);
      console.error('Error updating person:', err);
    }
  };

  const handleDeletePerson = async (personId: string) => {
    if (window.confirm('Are you sure you want to delete this person from your memory?')) {
      try {
        await deletePerson(personId);
        toast.success('Person deleted successfully!');
      } catch (err) {
        toast.error(`Failed to delete person: ${(err as Error).message}`);
        console.error('Error deleting person:', err);
      }
    }
  };

  if (isLoading) {
    return <Card><CardContent>Loading people...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="text-red-500">Error: {error.message}</CardContent></Card>;
  }

  return (
    <Card className="h-full flex flex-col">
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
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Textarea id="notes" value={newPersonNotes} onChange={(e) => setNewPersonNotes(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="avatarUrl" className="text-right">Avatar URL</Label>
                <Input id="avatarUrl" value={newPersonAvatarUrl} onChange={(e) => setNewPersonAvatarUrl(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddPerson}>Save Person</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {people?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">No people added yet. Add someone to remember!</p>
        ) : (
          <div className="space-y-3">
            {people?.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    {person.avatar_url ? (
                      <AvatarImage src={person.avatar_url} alt={person.name} />
                    ) : (
                      <AvatarFallback className="text-sm">
                        {person.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{person.name}</p>
                    {person.notes && <p className="text-xs text-gray-500 line-clamp-1">{person.notes}</p>}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEditPerson(person)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePerson(person.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Person Dialog */}
      <Dialog open={isEditPersonDialogOpen} onOpenChange={setIsEditPersonDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input id="edit-name" value={editPersonName} onChange={(e) => setEditPersonName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-notes" className="text-right">Notes</Label>
              <Textarea id="edit-notes" value={editPersonNotes} onChange={(e) => setEditPersonNotes(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-avatarUrl" className="text-right">Avatar URL</Label>
              <Input id="edit-avatarUrl" value={editPersonAvatarUrl} onChange={(e) => setEditPersonAvatarUrl(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdatePerson}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PeopleMemoryCard;