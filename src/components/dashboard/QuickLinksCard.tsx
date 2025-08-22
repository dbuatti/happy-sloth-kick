import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { QuickLink } from '@/types/task';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TwitterPicker } from 'react-color';
import { showError } from '@/utils/toast';

const QuickLinksCard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    quickLinks,
    isLoading,
    error,
    addQuickLink,
    updateQuickLink,
    deleteQuickLink,
  } = useQuickLinks({ userId });

  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [isEditLinkDialogOpen, setIsEditLinkDialogOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState<QuickLink | null>(null);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [emoji, setEmoji] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');

  useEffect(() => {
    if (currentLink) {
      setTitle(currentLink.title);
      setUrl(currentLink.url);
      setEmoji(currentLink.emoji || '');
      setBackgroundColor(currentLink.background_color || '');
    } else {
      setTitle('');
      setUrl('');
      setEmoji('');
      setBackgroundColor('');
    }
  }, [currentLink]);

  const handleAddLink = async () => {
    if (!title.trim() || !url.trim()) {
      showError('Title and URL are required.');
      return;
    }
    await addQuickLink(title.trim(), url.trim(), emoji, backgroundColor);
    setIsAddLinkDialogOpen(false);
  };

  const handleUpdateLink = async () => {
    if (!currentLink || !title.trim() || !url.trim()) {
      showError('Title and URL are required.');
      return;
    }
    await updateQuickLink(currentLink.id, { title: title.trim(), url: url.trim(), emoji, background_color: backgroundColor });
    setIsEditLinkDialogOpen(false);
  };

  const handleDeleteLink = async (linkId: string) => {
    await deleteQuickLink(linkId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">Error loading quick links.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Quick Links</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsAddLinkDialogOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {quickLinks.length === 0 ? (
          <p className="text-gray-500">No quick links added yet.</p>
        ) : (
          quickLinks.map((link: QuickLink) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              style={{ backgroundColor: link.background_color || 'transparent' }}
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center flex-grow min-w-0">
                {link.emoji && <span className="mr-2 text-xl">{link.emoji}</span>}
                <span className="font-medium truncate">{link.title}</span>
              </a>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCurrentLink(link);
                    setIsEditLinkDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteLink(link.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={isAddLinkDialogOpen} onOpenChange={setIsAddLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Quick Link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url" className="text-right">
                URL
              </Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emoji" className="text-right">
                Emoji
              </Label>
              <Input id="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 🚀" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="background-color" className="text-right">
                Background
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start" style={{ backgroundColor: backgroundColor || 'transparent' }}>
                    {backgroundColor || 'Select Color'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <TwitterPicker color={backgroundColor} onChangeComplete={(color: any) => setBackgroundColor(color.hex)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLink}>Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditLinkDialogOpen} onOpenChange={setIsEditLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Quick Link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Title
              </Label>
              <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-url" className="text-right">
                URL
              </Label>
              <Input id="edit-url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-emoji" className="text-right">
                Emoji
              </Label>
              <Input id="edit-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 🚀" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-background-color" className="text-right">
                Background
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start" style={{ backgroundColor: backgroundColor || 'transparent' }}>
                    {backgroundColor || 'Select Color'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <TwitterPicker color={backgroundColor} onChangeComplete={(color: any) => setBackgroundColor(color.hex)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateLink}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickLinksCard;