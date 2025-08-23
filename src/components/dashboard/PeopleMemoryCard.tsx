import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User, Edit, Trash2, ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { Person } from '@/types';

interface PersonAvatarProps {
  person: Person;
  onClick: (person: Person) => void;
}

const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, onClick }) => (
  <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onClick(person)}>
    <Avatar className="h-16 w-16 mb-1 border-2 border-blue-400">
      <AvatarImage src={person.avatar_url || undefined} alt={person.name} />
      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-lg">
        {person.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="text-sm font-medium text-center">{person.name}</span>
  </div>
);

const PeopleMemoryCard = () => {
  const { people, isLoading, error, addPerson, updatePerson, deletePerson } = usePeopleMemory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const handleOpenAddModal = () => {
    setCurrentPerson(null);
    setName('');
    setNotes(null);
    setAvatarFile(null);
    setRemoveAvatar(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (person: Person) => {
    setCurrentPerson(person);
    setName(person.name);
    setNotes(person.notes);
    setAvatarFile(null);
    setRemoveAvatar(false);
    setIsModalOpen(true);
  };

  const handleSavePerson = async () => {
    if (!name.trim()) return;

    if (currentPerson) {
      const updates: Partial<Person> = { name, notes };
      if (removeAvatar) {
        updates.avatar_url = null;
      }
      await updatePerson({ id: currentPerson.id, updates, avatarFile });
    } else {
      await addPerson({ personData: { name, notes }, avatarFile });
    }
    setIsModalOpen(false);
  };

  const handleDeletePerson = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this person from memory?')) {
      await deletePerson(id);
      setIsModalOpen(false);
    }
  };

  if (isLoading) return <div className="text-center py-4">Loading people...</div>;
  if (error) return <div className="text-center py-4 text-red-500">Error: {error.message}</div>;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">People Memory</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleOpenAddModal}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {(people as Person[]).length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
            <User className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-500">No people in your memory yet.</p>
            <Button variant="link" onClick={handleOpenAddModal}>Add someone now?</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {(people as Person[]).map(person => (
              <PersonAvatar key={person.id} person={person} onClick={handleOpenEditModal} />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentPerson ? 'Edit Person' : 'Add New Person'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Textarea id="notes" value={notes || ''} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="avatar" className="text-right">Avatar</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input id="avatar" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)} />
                {currentPerson?.avatar_url && !removeAvatar && (
                  <Button variant="outline" size="icon" onClick={() => setRemoveAvatar(true)} title="Remove current avatar">
                    <ImageOff className="h-4 w-4" />
                  </Button>
                )}
                {removeAvatar && <span className="text-sm text-red-500">Avatar will be removed</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            {currentPerson && (
              <Button variant="destructive" onClick={() => handleDeletePerson(currentPerson.id)}>Delete</Button>
            )}
            <Button type="submit" onClick={handleSavePerson}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PeopleMemoryCard;