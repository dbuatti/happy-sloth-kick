import React, { useState } from 'react';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { QuickLink } from '@/types/task';
import QuickLinkForm from './QuickLinkForm';
import { Loader2 } from 'lucide-react';

interface QuickLinksProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;

  const { quickLinks, isLoading, error, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks({ userId });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const handleSaveLink = async (data: Partial<QuickLink>) => {
    if (editingLink) {
      await updateQuickLink(editingLink.id, data);
    } else {
      await addQuickLink(data.title!, data.url!, data.emoji || null, data.background_color || null);
    }
    setIsFormOpen(false);
    setEditingLink(null);
  };

  const handleDeleteLink = async (id: string) => {
    await deleteQuickLink(id);
    setIsFormOpen(false);
    setEditingLink(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
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
        <Button variant="ghost" size="icon" onClick={() => { setEditingLink(null); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {quickLinks.length === 0 ? (
          <p className="text-gray-500">No quick links added yet.</p>
        ) : (
          quickLinks.map((link) => (
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
                    setEditingLink(link);
                    setIsFormOpen(true);
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

      {isFormOpen && (
        <QuickLinkForm
          link={editingLink}
          onSave={handleSaveLink}
          onCancel={() => setIsFormOpen(false)}
          onDelete={handleDeleteLink}
        />
      )}
    </Card>
  );
};

export default QuickLinks;