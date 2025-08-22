import React, { useState } from 'react';
import { useQuickLinks, QuickLink } from '@/hooks/useQuickLinks';
import { Button } from '@/components/ui/button';
import { Plus, Link as LinkIcon, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import QuickLinkForm from './QuickLinkForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface QuickLinksProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ isDemo = false, demoUserId }) => {
  const { quickLinks, loading, addQuickLink, updateQuickLink, deleteQuickLink } = useQuickLinks({ userId: demoUserId });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);

  const handleOpenForm = (link: QuickLink | null) => {
    setEditingLink(link);
    setIsFormOpen(true);
  };

  const handleSave = async (data: { title: string; url: string; imageFile?: File | null; emoji?: string | null; backgroundColor?: string | null; avatarText?: string | null; }) => {
    if (editingLink) {
      await updateQuickLink({ id: editingLink.id, updates: data, imageFile: data.imageFile });
    } else {
      await addQuickLink(data);
    }
  };

  return (
    <>
      <fieldset className="rounded-xl border-2 border-border p-3">
        <legend className="px-2 text-sm text-muted-foreground -ml-1 font-medium">Links</legend>
        <div className="flex items-center gap-3 min-h-[40px]">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))
          ) : (
            <>
              {quickLinks.map(link => (
                <div key={link.id} className="relative group flex flex-col items-center gap-1 text-center">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Avatar className="h-10 w-10 border-2 border-muted hover:border-primary transition-colors" style={{ backgroundColor: link.image_url ? 'transparent' : link.background_color || undefined }}>
                      <AvatarImage src={link.image_url || undefined} alt={link.title} />
                      <AvatarFallback className="text-xl text-white">
                        {link.emoji ? (
                          <span>{link.emoji}</span>
                        ) : link.avatar_text ? (
                          <span className="font-bold">{link.avatar_text}</span>
                        ) : (
                          <LinkIcon className="h-5 w-5 text-foreground" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </a>
                  {!isDemo && (
                    <div className="absolute top-[-4px] right-[-4px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background/80">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleOpenForm(link)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setLinkToDelete(link.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
              {!isDemo && (
                <Button variant="outline" className="h-10 w-10 rounded-full flex-shrink-0" onClick={() => handleOpenForm(null)}>
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </fieldset>

      <QuickLinkForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingLink}
      />

      <AlertDialog open={!!linkToDelete} onOpenChange={() => setLinkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this quick link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (linkToDelete) {
                await deleteQuickLink(linkToDelete);
                setLinkToDelete(null);
              }
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default QuickLinks;