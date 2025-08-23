import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDevIdeas } from '@/hooks/useDevIdeas';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, DevSpaceProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, X, Tag as TagIcon } from 'lucide-react';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'react-hot-toast';
import { getRandomTagColor } from '@/lib/tagColors';
import DevIdeaForm from '@/components/DevIdeaForm';
import { Label } from '@/components/ui/label';
import { DialogTrigger } from '@radix-ui/react-dialog';

const DevSpace: React.FC<DevSpaceProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    ideas,
    isLoadingIdeas,
    ideasError,
    addIdea,
    updateIdea,
    deleteIdea,
    tags,
    isLoadingTags,
    tagsError,
    addTag,
    deleteTag,
  } = useDevIdeas({ userId: currentUserId });

  const [isAddIdeaDialogOpen, setIsAddIdeaDialogOpen] = useState(false);
  const [isEditIdeaDialogOpen, setIsEditIdeaDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);

  const [isAddTagDialogOpen, setIsAddTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(getRandomTagColor());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates!,
    })
  );

  const handleAddIdea = async (data: NewDevIdeaData) => {
    try {
      await addIdea(data);
      setIsAddIdeaDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add idea.');
      console.error('Error adding idea:', error);
    }
  };

  const handleUpdateIdea = async (data: UpdateDevIdeaData) => {
    if (!editingIdea?.id) return;
    try {
      await updateIdea({ id: editingIdea.id, updates: data });
      setIsEditIdeaDialogOpen(false);
      setEditingIdea(null);
    } catch (error) {
      toast.error('Failed to update idea.');
      console.error('Error updating idea:', error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this idea?')) {
      try {
        await deleteIdea(id);
      } catch (error) {
        toast.error('Failed to delete idea.');
        console.error('Error deleting idea:', error);
      }
    }
  };

  const openEditDialog = (idea: DevIdea) => {
    setEditingIdea(idea);
    setIsEditIdeaDialogOpen(true);
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty.');
      return;
    }
    try {
      await addTag({ name: newTagName, color: newTagColor });
      setNewTagName('');
      setNewTagColor(getRandomTagColor());
      setIsAddTagDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add tag.');
      console.error('Error adding tag:', error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    const oldIndex = ideas.findIndex(idea => idea.id === active.id);
    const newIndex = ideas.findIndex(idea => idea.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(ideas, oldIndex, newIndex);
      // TODO: Implement reordering logic if 'order' column is added to dev_ideas
      // For now, just update the local state or re-fetch
      toast.info('Reordering not fully implemented for dev ideas yet.');
    }
  };

  if (authLoading || isLoadingIdeas || isLoadingTags) {
    return <div className="p-4 text-center">Loading Dev Space...</div>;
  }

  if (ideasError || tagsError) {
    return <div className="p-4 text-red-500">Error loading data: {ideasError?.message || tagsError?.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dev Space</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddTagDialogOpen} onOpenChange={setIsAddTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TagIcon className="mr-2 h-4 w-4" /> Manage Tags
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Manage Tags</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="New tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-grow"
                  />
                  <Input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-12 h-9 p-0"
                  />
                  <Button onClick={handleAddTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between p-2 border rounded-md" style={{ backgroundColor: tag.color, color: 'white' }}>
                      <span>{tag.name}</span>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => deleteTag(tag.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTagDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddIdeaDialogOpen} onOpenChange={setIsAddIdeaDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Idea
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Dev Idea</DialogTitle>
              </DialogHeader>
              <DevIdeaForm
                onSave={handleAddIdea}
                onCancel={() => setIsAddIdeaDialogOpen(false)}
                tags={tags}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <SortableContext items={ideas.map(idea => idea.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => (
              <SortableDevIdeaCard
                key={idea.id}
                id={idea.id}
                idea={idea}
                onEdit={openEditDialog}
                onDelete={handleDeleteIdea}
                onUpdateStatus={async (id, status) => { await updateIdea({ id, updates: { status } }); }}
                onUpdatePriority={async (id, priority) => { await updateIdea({ id, updates: { priority } }); }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={isEditIdeaDialogOpen} onOpenChange={setIsEditIdeaDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Dev Idea</DialogTitle>
          </DialogHeader>
          <DevIdeaForm
            initialData={editingIdea}
            onSave={handleUpdateIdea}
            onCancel={() => setIsEditIdeaDialogOpen(false)}
            tags={tags}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DevSpace;