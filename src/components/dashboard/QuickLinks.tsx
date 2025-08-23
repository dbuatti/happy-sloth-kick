import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QuickLinkForm from './QuickLinkForm';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData, QuickLinksProps } from '@/types';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const QuickLinks: React.FC<QuickLinksProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { quickLinks, isLoading, error, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks();

  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [isEditLinkDialogOpen, setIsEditLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const handleAddLink = async (data: NewQuickLinkData) => {
    if (!currentUserId) return;
    await addQuickLink(data);
    setIsAddLinkDialogOpen(false);
  };

  const handleUpdateLink = async (data: UpdateQuickLinkData) => {
    if (!currentUserId || !data.id) return;
    await updateQuickLink({ id: data.id, updates: data });
    setIsEditLinkDialogOpen(false);
    setEditingLink(null);
  };

  const handleDeleteLink = async (id: string) => {
    if (!currentUserId) return;
    if (window.confirm('Are you sure you want to delete this quick link?')) {
      await deleteQuickLink(id);
    }
  };

  const openEditDialog = (link: QuickLink) => {
    setEditingLink(link);
    setIsEditLinkDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading quick links...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading quick links: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Quick Links</CardTitle>
        <Dialog open={isAddLinkDialogOpen} onOpenChange={setIsAddLinkDialogOpen}>
          <Button variant="ghost" size="sm" onClick={() => setIsAddLinkDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Link
          </Button>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Quick Link</DialogTitle>
            </DialogHeader>
            <QuickLinkForm onSave={handleAddLink} onCancel={() => setIsAddLinkDialogOpen(false)} isEditing={false} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {quickLinks.length === 0 ? (
          <p className="text-muted-foreground">No quick links added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <div
                key={link.id}
                className="relative flex flex-col items-center justify-center p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: link.background_color || '#f0f0f0' }}
              >
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center">
                  {link.emoji && <span className="text-3xl mb-2">{link.emoji}</span>}
                  {!link.emoji && link.avatar_text && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-700 mb-2">
                      {link.avatar_text}
                    </div>
                  )}
                  {!link.emoji && !link.avatar_text && link.image_url && (
                    <img src={link.image_url} alt={link.title} className="w-10 h-10 object-cover rounded-full mb-2" />
                  )}
                  <p className="text-sm font-medium text-foreground">{link.title}</p>
                </a>
                <div className="absolute top-1 right-1 flex space-x-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog(link)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteLink(link.id)}>
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
            <QuickLinkForm initialData={editingLink} onSave={handleUpdateLink} onCancel={() => setIsEditLinkDialogOpen(false)} isEditing={true} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default QuickLinks;