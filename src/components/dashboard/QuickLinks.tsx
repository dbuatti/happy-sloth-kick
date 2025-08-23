import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Link as LinkIcon, Edit, Trash2, ExternalLink, ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'; // Added DialogTrigger
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData, QuickLinksProps } from '@/types'; // Corrected imports
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful'; // Import HexColorPicker

const QuickLinks: React.FC<QuickLinksProps> = ({ isDemo = false, demoUserId }) => {
  const { quickLinks, isLoading, error, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks();

  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkEmoji, setNewLinkEmoji] = useState('');
  const [newLinkBackgroundColor, setNewLinkBackgroundColor] = useState('#3b82f6'); // Default blue
  const [newLinkAvatarText, setNewLinkAvatarText] = useState('');

  const [isEditLinkDialogOpen, setIsEditLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [editLinkTitle, setEditLinkTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkEmoji, setEditLinkEmoji] = useState('');
  const [editLinkBackgroundColor, setEditLinkBackgroundColor] = useState('');
  const [editLinkAvatarText, setEditLinkAvatarText] = useState('');

  const handleAddLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast.error('Title and URL are required.');
      return;
    }
    try {
      const newLinkData: NewQuickLinkData = {
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim(),
        emoji: newLinkEmoji.trim() || null,
        background_color: newLinkBackgroundColor,
        avatar_text: newLinkAvatarText.trim() || null,
      };
      await addQuickLink(newLinkData);
      toast.success('Quick link added successfully!');
      setNewLinkTitle('');
      setNewLinkUrl('');
      setNewLinkEmoji('');
      setNewLinkBackgroundColor('#3b82f6');
      setNewLinkAvatarText('');
      setIsAddLinkDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to add quick link: ${(err as Error).message}`);
      console.error('Error adding quick link:', err);
    }
  };

  const handleEditLink = (link: QuickLink) => {
    setEditingLink(link);
    setEditLinkTitle(link.title);
    setEditLinkUrl(link.url);
    setEditLinkEmoji(link.emoji || '');
    setEditLinkBackgroundColor(link.background_color || '#3b82f6');
    setEditLinkAvatarText(link.avatar_text || '');
    setIsEditLinkDialogOpen(true);
  };

  const handleUpdateLink = async () => {
    if (!editingLink || !editLinkTitle.trim() || !editLinkUrl.trim()) {
      toast.error('Title and URL are required.');
      return;
    }
    try {
      const updates: UpdateQuickLinkData = {
        title: editLinkTitle.trim(),
        url: editLinkUrl.trim(),
        emoji: editLinkEmoji.trim() || null,
        background_color: editLinkBackgroundColor,
        avatar_text: editLinkAvatarText.trim() || null,
      };
      await updateQuickLink({ id: editingLink.id, updates });
      toast.success('Quick link updated successfully!');
      setIsEditLinkDialogOpen(false);
      setEditingLink(null);
    } catch (err) {
      toast.error(`Failed to update quick link: ${(err as Error).message}`);
      console.error('Error updating quick link:', err);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (window.confirm('Are you sure you want to delete this quick link?')) {
      try {
        await deleteQuickLink(linkId);
        toast.success('Quick link deleted successfully!');
      } catch (err) {
        toast.error(`Failed to delete quick link: ${(err as Error).message}`);
        console.error('Error deleting quick link:', err);
      }
    }
  };

  if (isLoading) {
    return <Card><CardContent>Loading quick links...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="text-red-500">Error: {error.message}</CardContent></Card>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Quick Links</CardTitle>
        <Dialog open={isAddLinkDialogOpen} onOpenChange={setIsAddLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Quick Link</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">URL</Label>
                <Input id="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emoji" className="text-right">Emoji</Label>
                <Input id="emoji" value={newLinkEmoji} onChange={(e) => setNewLinkEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 🚀" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="avatarText" className="text-right">Avatar Text</Label>
                <Input id="avatarText" value={newLinkAvatarText} onChange={(e) => setNewLinkAvatarText(e.target.value)} className="col-span-3" placeholder="e.g., GH" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="backgroundColor" className="text-right">Background Color</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="col-span-3 justify-start" style={{ backgroundColor: newLinkBackgroundColor }}>
                      <div className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: newLinkBackgroundColor }} />
                      {newLinkBackgroundColor}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <HexColorPicker color={newLinkBackgroundColor} onChange={setNewLinkBackgroundColor} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddLink}>Save Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {quickLinks?.length === 0 ? (
          <p className="text-sm text-gray-500">No quick links added yet. Add some to get started!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickLinks?.map((link: QuickLink) => (
              <div key={link.id} className="flex items-center space-x-2 p-2 border rounded-md">
                <Avatar className="h-8 w-8" style={{ backgroundColor: link.background_color || '#ccc' }}>
                  {link.image_url ? (
                    <AvatarImage src={link.image_url} alt={link.title} />
                  ) : (
                    <AvatarFallback className="text-sm font-semibold text-white">
                      {link.emoji || link.avatar_text || link.title.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline flex items-center">
                    {link.title} <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEditLink(link)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteLink(link.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Quick Link Dialog */}
      <Dialog open={isEditLinkDialogOpen} onOpenChange={setIsEditLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Quick Link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">Title</Label>
              <Input id="edit-title" value={editLinkTitle} onChange={(e) => setEditLinkTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-url" className="text-right">URL</Label>
              <Input id="edit-url" value={editLinkUrl} onChange={(e) => setEditLinkUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-emoji" className="text-right">Emoji</Label>
              <Input id="edit-emoji" value={editLinkEmoji} onChange={(e) => setEditLinkEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 🚀" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-avatarText" className="text-right">Avatar Text</Label>
              <Input id="edit-avatarText" value={editLinkAvatarText} onChange={(e) => setEditLinkAvatarText(e.target.value)} className="col-span-3" placeholder="e.g., GH" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-backgroundColor" className="text-right">Background Color</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start" style={{ backgroundColor: editLinkBackgroundColor }}>
                    <div className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: editLinkBackgroundColor }} />
                    {editLinkBackgroundColor}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <HexColorPicker color={editLinkBackgroundColor} onChange={setEditLinkBackgroundColor} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateLink}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickLinks;