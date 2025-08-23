import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Link as LinkIcon, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import QuickLinkForm from './QuickLinkForm';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData, QuickLinksProps } from '@/types';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const QuickLinks: React.FC<QuickLinksProps> = ({ isDemo = false, demoUserId }) => {
  const { quickLinks, isLoading, error, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks();
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
      await updateQuickLink({ id: editingLink.id, updates });
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

  if (isLoading) return <Card><CardContent><p>Loading quick links...</p></CardContent></Card>;
  if (error) return <Card><CardContent><p>Error: {error.message}</p></CardContent></Card>;

  return (
    <Card>
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
            <QuickLinkForm onSave={handleAddLink} onCancel={() => setIsAddLinkDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {quickLinks && quickLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quick links added yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickLinks?.map((link) => (
              <div
                key={link.id}
                className="relative flex flex-col items-center justify-center p-4 rounded-lg shadow-sm hover:shadow-md transition-all"
                style={{ backgroundColor: link.background_color || '#f0f0f0' }}
              >
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full h-full">
                  {link.emoji && <span className="text-3xl mb-2">{link.emoji}</span>}
                  {!link.emoji && link.avatar_text && (
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 text-gray-800 text-lg font-semibold mb-2">
                      {link.avatar_text}
                    </div>
                  )}
                  {!link.emoji && !link.avatar_text && <LinkIcon className="h-8 w-8 text-gray-600 mb-2" />}
                  <p className="text-sm font-medium text-center">{link.title}</p>
                </a>
                <div className="absolute top-1 right-1 flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-500 hover:text-blue-500"
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
                    className="h-6 w-6 text-gray-500 hover:text-red-500"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isEditLinkDialogOpen} onOpenChange={setIsEditLinkDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Quick Link</DialogTitle>
            </DialogHeader>
            <QuickLinkForm initialData={editingLink || undefined} onSave={handleUpdateLink} onCancel={() => setIsEditLinkDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default QuickLinks;