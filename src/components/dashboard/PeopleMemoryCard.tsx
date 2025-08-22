import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { useAuth } from '@/context/AuthContext';
import { PeopleMemory } from '@/types/task';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { showError, showSuccess } from '@/utils/toast';
import { PeopleMemoryCardProps } from '@/types/props';

const PeopleMemoryCard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    people,
    isLoading,
    error,
    addPerson,
    updatePerson,
    deletePerson,
  } = usePeopleMemory(userId);

  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PeopleMemory | null>(null);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (editingPerson) {
      setName(editingPerson.name);
      setNotes(editingPerson.notes || '');
      setAvatarUrl(editingPerson.avatar_url || '');
    } else {
      resetForm();
    }
  }, [editingPerson]);

  const resetForm = () => {
    setName('');
    setNotes('');
    setAvatarUrl('');
  };

  const handleOpenDialog = (person: PeopleMemory | null) => {
    setEditingPerson(person);
    setIsPersonDialogOpen(true);
  };

  const handleSavePerson = async () => {
    if (!name.trim()) {
      showError('Name is required.');
      return;
    }

    const personData: Partial<PeopleMemory> = {
      name: name.trim(),
      notes: notes,
      avatar_url: avatarUrl,
      user_id: userId!,
    };

    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, personData);
        showSuccess('Person updated successfully!');
      } else {
        await addPerson(name.trim(), notes, avatarUrl);
        showSuccess('Person added successfully!');
      }
      setIsPersonDialogOpen(false);
    } catch (error) {
      showError('Failed to save person.');
      console.error('Error saving person:', error);
    }
  };

  const handleDeletePerson = async (personId: string) => {
    await deletePerson(personId);
    showSuccess('Person deleted successfully!');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">People Memory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">People Memory</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">Error loading people memory.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">People Memory</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(null)}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 max-h-48 overflow-y-auto">
        {people.length === 0 ? (
          <p className="text-gray-500 text-sm">No people added yet. Add someone to remember!</p>
        ) : (
          people.map((person) => (
            <div key={person.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
              <div className="flex items-center flex-grow min-w-0">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={person.avatar_url || undefined} alt={person.name} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{person.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(person)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeletePerson(person.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={isPersonDialogOpen} onOpenChange={setIsPersonDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Edit Person' : 'Add New Person'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="avatar-url" className="text-right">Avatar URL</Label>
              <Input id="avatar-url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="col-span-3" placeholder="Optional image URL" />
            </div>
          </div>
          <DialogFooter>
            {editingPerson && (
              <Button variant="destructive" onClick={() => handleDeletePerson(editingPerson.id)}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsPersonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePerson}>
              {editingPerson ? 'Save Changes' : 'Add Person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PeopleMemoryCard;