import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Link, Edit, Trash2, ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { QuickLink } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';

interface QuickLinkItemProps {
  link: QuickLink;
  onEdit: (link: QuickLink) => void;
  onDelete: (id: string) => void;
}

const QuickLinkItem: React.FC<QuickLinkItemProps> = ({ link, onEdit, onDelete }) => {
  const displayContent = link.emoji || link.avatar_text || (link.title ? link.title.charAt(0).toUpperCase() : '?');
  const backgroundColor = link.background_color || '#e2e8f0'; // Default gray-200

  return (
    <div className="relative group flex flex-col items-center gap-1 text-center">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center h-16 w-16 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        style={{ backgroundColor: backgroundColor }}
      >
        {link.image_url ? (
          <Avatar className="h-full w-full rounded-lg">
            <AvatarImage src={link.image_url} alt={link.title} className="object-cover" />
            <AvatarFallback className="bg-transparent text-gray-700 text-xl font-bold">{displayContent}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex items-center justify-center h-full w-full text-gray-700 text-xl font-bold">
            {link.emoji || link.avatar_text || (link.title ? link.title.charAt(0).toUpperCase() : '?')}
          </div>
        )}
      </a>
      <span className="text-sm text-gray-700 font-medium max-w-[80px] truncate">{link.title}</span>
      <div className="absolute top-0 right-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-white/80 hover:bg-white" onClick={() => onEdit(link)}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-white/80 hover:bg-white" onClick={() => onDelete(link.id)}>
          <Trash2 className="h-3 w-3 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

const QuickLinks = () => {
  const { quickLinks, isLoading, error, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState<QuickLink | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [avatarText, setAvatarText] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const handleOpenAddModal = () => {
    setCurrentLink(null);
    setTitle('');
    setUrl('');
    setImageFile(null);
    setEmoji(null);
    setBackgroundColor(null);
    setAvatarText(null);
    setRemoveImage(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (link: QuickLink) => {
    setCurrentLink(link);
    setTitle(link.title);
    setUrl(link.url);
    setImageFile(null);
    setEmoji(link.emoji);
    setBackgroundColor(link.background_color);
    setAvatarText(link.avatar_text);
    setRemoveImage(false);
    setIsModalOpen(true);
  };

  const handleSaveLink = async () => {
    if (!title.trim() || !url.trim()) return;

    if (currentLink) {
      const updates: Partial<QuickLink> = { title, url, emoji, background_color: backgroundColor, avatar_text: avatarText };
      if (removeImage) {
        updates.image_url = null;
      }
      await updateQuickLink({ id: currentLink.id, updates, imageFile });
    } else {
      await addQuickLink({ title, url, imageFile, emoji, backgroundColor, avatarText });
    }
    setIsModalOpen(false);
  };

  const handleDeleteLink = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quick link?')) {
      await deleteQuickLink(id);
      setIsModalOpen(false);
    }
  };

  if (isLoading) return <div className="text-center py-4">Loading quick links...</div>;
  if (error) return <div className="text-center py-4 text-red-500">Error: {error.message}</div>;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Quick Links</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleOpenAddModal}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {(quickLinks as QuickLink[]).length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
            <Link className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-500">No quick links added yet.</p>
            <Button variant="link" onClick={handleOpenAddModal}>Add one now?</Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {(quickLinks as QuickLink[]).map(link => (
              <QuickLinkItem key={link.id} link={link} onEdit={handleOpenEditModal} onDelete={handleDeleteLink} />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentLink ? 'Edit Quick Link' : 'Add New Quick Link'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url" className="text-right">URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">Image</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} />
                {currentLink?.image_url && !removeImage && (
                  <Button variant="outline" size="icon" onClick={() => setRemoveImage(true)} title="Remove current image">
                    <ImageOff className="h-4 w-4" />
                  </Button>
                )}
                {removeImage && <span className="text-sm text-red-500">Image will be removed</span>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emoji" className="text-right">Emoji</Label>
              <Input id="emoji" value={emoji || ''} onChange={(e) => setEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 👋" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="avatarText" className="text-right">Avatar Text</Label>
              <Input id="avatarText" value={avatarText || ''} onChange={(e) => setAvatarText(e.target.value)} className="col-span-3" placeholder="e.g., DY" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="backgroundColor" className="text-right">Background Color</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input id="backgroundColor" type="text" value={backgroundColor || ''} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-grow" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-8 p-0" style={{ backgroundColor: backgroundColor || '#e2e8f0' }}></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <HexColorPicker color={backgroundColor || '#e2e8f0'} onChange={setBackgroundColor} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            {currentLink && (
              <Button variant="destructive" onClick={() => handleDeleteLink(currentLink.id)}>Delete</Button>
            )}
            <Button type="submit" onClick={handleSaveLink}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickLinks;