import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Link as LinkIcon, Edit, Trash2, ExternalLink, ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types';
import { toast } from 'react-hot-toast';
import QuickLinkForm from './QuickLinkForm';

interface QuickLinksProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ isDemo = false, demoUserId }) => {
  const { quickLinks, isLoading, error, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks();

  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [isEditLinkDialogOpen, setIsEditLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const handleAddLink = async (newLinkData: NewQuickLinkData) => {
    try {
      await addQuickLink(newLinkData);
      toast.success('Quick link added!');
      setIsAddLinkDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to add link: ${(err as Error).message}`);
      console.error('Error adding quick link:', err);
    }
  };

  const handleEditLink = (link: QuickLink) => {
    setEditingLink(link);
    setIsEditLinkDialogOpen(true);
  };

  const handleUpdateLink = async (updates: UpdateQuickLinkData) => {
    if (!editingLink) return;
    try {
      await updateQuickLink({ id: editingLink.id, updates });
      toast.success('Quick link updated!');
      setIsEditLinkDialogOpen(false);
      setEditingLink(null);
    } catch (err) {
      toast.error(`Failed to update link: ${(err as Error).message}`);
      console.error('Error updating quick link:', err);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (window.confirm('Are you sure you want to delete this quick link?')) {
      try {
        await deleteQuickLink(linkId);
        toast.success('Quick link deleted!');
      } catch (err) {
        toast.error(`Failed to delete link: ${(err as Error).message}`);
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
            <QuickLinkForm onSubmit={handleAddLink} onCancel={() => setIsAddLinkDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {quickLinks?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">No quick links added yet. Add some useful links!</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {quickLinks?.map((link) => (
              <div
                key={link.id}
                className="relative flex flex-col items-center justify-center p-3 rounded-lg border hover:shadow-md transition-shadow"
                style={{ backgroundColor: link.background_color || 'transparent' }}
              >
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center">
                  {link.image_url ? (
                    <img src={link.image_url} alt={link.title} className="h-8 w-8 object-contain" />
                  ) : link.emoji ? (
                    <span className="text-2xl">{link.emoji}</span>
                  ) : link.avatar_text ? (
                    <span className="text-lg font-bold">{link.avatar_text}</span>
                  ) : (
                    <LinkIcon className="h-8 w-8 text-gray-500" />
                  )}
                </a>
                <div className="absolute top-1 right-1 flex space-x-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); handleEditLink(link); }}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={(e) => { e.preventDefault(); handleDeleteLink(link.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="mt-1 text-xs font-medium text-center line-clamp-1">{link.title}</p>
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
          <QuickLinkForm initialData={editingLink} onSubmit={handleUpdateLink} onCancel={() => setIsEditLinkDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickLinks;