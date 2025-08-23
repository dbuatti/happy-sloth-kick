import React, { useState } from 'react';
import { Person, PersonAvatarProps, UpdatePersonData } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, onEdit, onDelete, onUpdateAvatar }) => {
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState(person.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      toast.error('You must select an image to upload.');
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${person.id}/${fileName}`;

    setIsUploading(true);
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Error uploading avatar: ' + uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (publicUrlData.publicUrl) {
      await onUpdateAvatar(person.id, publicUrlData.publicUrl);
      setNewAvatarUrl(publicUrlData.publicUrl);
      toast.success('Avatar uploaded successfully!');
    } else {
      toast.error('Failed to get public URL for avatar.');
    }
    setIsUploading(false);
    setIsEditingAvatar(false);
  };

  return (
    <>
      <div className="relative group">
        <Avatar className="h-16 w-16 cursor-pointer" onClick={() => onEdit(person)}>
          {person.avatar_url ? (
            <AvatarImage src={person.avatar_url} alt={person.name} />
          ) : (
            <AvatarFallback className="text-3xl">
              {person.name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="absolute bottom-0 right-0 bg-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingAvatar(true)}>
            <ImageIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <Dialog open={isEditingAvatar} onOpenChange={setIsEditingAvatar}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Avatar for {person.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                {newAvatarUrl ? (
                  <AvatarImage src={newAvatarUrl} alt={person.name} />
                ) : (
                  <AvatarFallback className="text-5xl">
                    {person.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="avatar">Upload new avatar</Label>
                <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingAvatar(false)}>Close</Button>
            {newAvatarUrl && (
              <Button variant="destructive" onClick={() => onUpdateAvatar(person.id, null)}>Remove Avatar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PersonAvatar;