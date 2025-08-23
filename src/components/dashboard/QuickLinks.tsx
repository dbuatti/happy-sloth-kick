import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Link as LinkIcon, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import QuickLinkForm from './QuickLinkForm';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData, QuickLinksProps } from '@/types';
import { toast } from 'react-hot-toast';

const QuickLinks: React.FC<QuickLinksProps> = ({ isDemo = false, demoUserId }) => {
  const { quickLinks, isLoading, error, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks(demoUserId);
  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [isEditLinkDialogOpen, setIsEditLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const handleAddLink = async (newLinkData: NewQuickLinkData) => {
    try {
      await addQuickLink(newLinkData);
      setIsAddLinkDialogOpen(false);
    } catch (err) {
      toast.error('Failed to add quick link.');
      console.error(err);
    }
  };

  const handleUpdateLink = async (updates: UpdateQuickLinkData) => {
    if (!editingLink) return;
    try {
      await updateQuickLink(editingLink.id, updates);
      setIsEditLinkDialogOpen(false);
      setEditingLink(null);
    } catch (err) {
      toast.error('Failed to update quick link.');
      console.error(err);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quick link?')) {
      try {
        await deleteQuickLink(id);
      } catch (err) {
        toast.error('Failed to delete quick link.');
        console.error(err);
      }
    }
  };

  if (isLoading) return <div>Loading quick links...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Quick Links</h2>
        <Dialog open={isAddLinkDialogOpen} onOpenChange={setIsAddLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Quick Link</DialogTitle>
            </DialogHeader>
            <QuickLinkForm onSubmit={handleAddLink} onCancel={() => setIsAddLinkDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {quickLinks?.map((link) => (
          <div
            key={link.id}
            className="relative flex flex-col items-center justify-center p-4 rounded-lg shadow-md group"
            style={{ backgroundColor: link.background_color || '#f0f0f0' }}
          >
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full h-full">
              {link.image_url ? (
                <img src={link.image_url} alt={link.title} className="w-12 h-12 object-cover rounded-full mb-2" />
              ) : link.emoji ? (
                <span className="text-4xl mb-2">{link.emoji}</span>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-gray-700 mb-2">
                  {link.avatar_text || link.title.charAt(0)}
                </div>
              )}
              <p className="text-sm font-medium text-center">{link.title}</p>
            </a>
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-600 hover:bg-gray-200"
                onClick={() => {
                  setEditingLink(link);
                  setIsEditLinkDialogOpen(true);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:bg-red-100"
                onClick={() => handleDeleteLink(link.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isEditLinkDialogOpen} onOpenChange={setIsEditLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quick Link</DialogTitle>
          </DialogHeader>
          <QuickLinkForm initialData={editingLink} onSubmit={handleUpdateLink} onCancel={() => setIsEditLinkDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickLinks;