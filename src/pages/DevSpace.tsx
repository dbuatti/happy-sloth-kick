import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDevIdeas } from '@/hooks/useDevIdeas';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, NewDevIdeaTagData, UpdateDevIdeaTagData, DevSpaceProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, X, Tag as TagIcon, Image as ImageIcon, UploadCloud } from 'lucide-react';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'react-hot-toast';
import { MultiSelect } from '@/components/ui/multi-select';
import { getRandomTagColor } from '@/lib/tagColors';
import DevIdeaForm from '@/components/DevIdeaForm';
import { Label } from '@/components/ui/label';

const DevSpace: React.FC<DevSpaceProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { ideas: fetchedIdeas, tags: fetchedTags, isLoading, error, addIdea, updateIdea, deleteIdea, createTag, updateTag, deleteTag } = useDevIdeas(isDemo, demoUserId);

  const [isAddIdeaDialogOpen, setIsAddIdeaDialogOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDescription, setNewIdeaDescription] = useState('');
  const [newIdeaStatus, setNewIdeaStatus] = useState<DevIdea['status']>('idea');
  const [newIdeaPriority, setNewIdeaPriority] = useState<DevIdea['priority']>('medium');
  const [newIdeaImageUrl, setNewIdeaImageUrl] = useState('');
  const [newIdeaLocalFilePath, setNewIdeaLocalFilePath] = useState('');
  const [newIdeaTagIds, setNewIdeaTagIds] = useState<string[]>([]);

  const [isEditIdeaDialogOpen, setIsEditIdeaDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);
  const [editIdeaTitle, setEditIdeaTitle] = useState('');
  const [editIdeaDescription, setEditIdeaDescription] = useState('');
  const [editIdeaStatus, setEditIdeaStatus] = useState<DevIdea['status']>('idea');
  const [editIdeaPriority, setEditIdeaPriority] = useState<DevIdea['priority']>('medium');
  const [editIdeaImageUrl, setEditIdeaImageUrl] = useState('');
  const [editIdeaLocalFilePath, setEditIdeaLocalFilePath] = useState('');
  const [editIdeaTagIds, setEditIdeaTagIds] = useState<string[]>([]);

  const [isManageTagsDialogOpen, setIsManageTagsDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#cccccc');
  const [editingTag, setEditingTag] = useState<DevIdeaTag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const [activeId, setActiveId] = useState<string | null>(null);

  const ideas = useMemo(() => fetchedIdeas || [], [fetchedIdeas]);
  const tags = useMemo(() => fetchedTags || [], [fetchedTags]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates!,
    })
  );

  const handleAddIdea = async (data: NewDevIdeaData & { tagIds?: string[] }) => {
    try {
      await addIdea(data);
      setIsAddIdeaDialogOpen(false);
      setNewIdeaTitle('');
      setNewIdeaDescription('');
      setNewIdeaStatus('idea');
      setNewIdeaPriority('medium');
      setNewIdeaImageUrl('');
      setNewIdeaLocalFilePath('');
      setNewIdeaTagIds([]);
    } catch (err) {
      toast.error('Failed to add idea.');
      console.error(err);
    }
  };

  const handleEditIdeaClick = (idea: DevIdea) => {
    setEditingIdea(idea);
    setEditIdeaTitle(idea.title);
    setEditIdeaDescription(idea.description || '');
    setEditIdeaStatus(idea.status);
    setEditIdeaPriority(idea.priority);
    setEditIdeaImageUrl(idea.image_url || '');
    setEditIdeaLocalFilePath(idea.local_file_path || '');
    setEditIdeaTagIds(idea.tags.map(tag => tag.id));
    setIsEditIdeaDialogOpen(true);
  };

  const handleUpdateIdea = async (data: UpdateDevIdeaData & { tagIds?: string[] }) => {
    if (!editingIdea) return;
    try {
      await updateIdea({ id: editingIdea.id, updates: data });
      setIsEditIdeaDialogOpen(false);
      setEditingIdea(null);
    } catch (err) {
      toast.error('Failed to update idea.');
      console.error(err);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this idea?')) {
      try {
        await deleteIdea(id);
      } catch (err) {
        toast.error('Failed to delete idea.');
        console.error(err);
      }
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty.');
      return;
    }
    try {
      const newTagData: NewDevIdeaTagData = {
        name: newTagName.trim(),
        color: newTagColor,
        user_id: currentUserId!,
      };
      await createTag(newTagData);
      setNewTagName('');
      setNewTagColor(getRandomTagColor());
    } catch (err) {
      toast.error('Failed to create tag.');
      console.error(err);
    }
  };

  const handleEditTagClick = (tag: DevIdeaTag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;
    if (!editTagName.trim()) {
      toast.error('Tag name cannot be empty.');
      return;
    }
    try {
      const updates: UpdateDevIdeaTagData = {
        name: editTagName.trim(),
        color: editTagColor,
      };
      await updateTag({ id: editingTag.id, updates });
      setEditingTag(null);
    } catch (err) {
      toast.error('Failed to update tag.');
      console.error(err);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tag? It will be removed from all ideas.')) {
      try {
        await deleteTag(id);
      } catch (err) {
        toast.error('Failed to delete tag.');
        console.error(err);
      }
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
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
    setActiveId(null);
  };

  const dragOverlayContent = activeId ? (
    ideas.find((idea) => idea.id === activeId) ? (
      <SortableDevIdeaCard
        id={activeId}
        idea={ideas.find((idea) => idea.id === activeId)!}
        onEdit={handleEditIdeaClick}
        onDelete={handleDeleteIdea}
        onUpdateStatus={() => {}}
        onUpdatePriority={() => {}}
      />
    ) : null
  ) : null;

  if (isLoading || authLoading) return <p>Loading Dev Space...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Dev Space</h1>

      <div className="flex justify-between items-center mb-4">
        <Dialog open={isAddIdeaDialogOpen} onOpenChange={setIsAddIdeaDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New Idea
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
              onCreateTag={createTag}
              onDeleteTag={deleteTag}
            />
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={() => setIsManageTagsDialogOpen(true)}>
          <TagIcon className="mr-2 h-4 w-4" /> Manage Tags
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ideas.map(idea => idea.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => (
              <SortableDevIdeaCard
                key={idea.id}
                id={idea.id}
                idea={idea}
                onEdit={handleEditIdeaClick}
                onDelete={handleDeleteIdea}
                onUpdateStatus={async (id, status) => await updateIdea({ id, updates: { status } })}
                onUpdatePriority={async (id, priority) => await updateIdea({ id, updates: { priority } })}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {dragOverlayContent}
        </DragOverlay>
      </DndContext>

      <Dialog open={isEditIdeaDialogOpen} onOpenChange={setIsEditIdeaDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Dev Idea</DialogTitle>
          </DialogHeader>
          <DevIdeaForm
            initialData={editingIdea || undefined}
            onSave={handleUpdateIdea}
            onCancel={() => setIsEditIdeaDialogOpen(false)}
            tags={tags}
            onCreateTag={createTag}
            onDeleteTag={deleteTag}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isManageTagsDialogOpen} onOpenChange={setIsManageTagsDialogOpen}>
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
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <Input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-20"
              />
              <Button onClick={handleCreateTag}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-2">
              {tags?.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  {editingTag?.id === tag.id ? (
                    <>
                      <Input
                        value={editTagName}
                        onChange={(e) => setEditTagName(e.target.value)}
                        className="flex-grow"
                      />
                      <Input
                        type="color"
                        value={editTagColor}
                        onChange={(e) => setEditTagColor(e.target.value)}
                        className="w-20"
                      />
                      <Button onClick={handleUpdateTag} size="sm">Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingTag(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-grow p-2 rounded-md text-white" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleEditTagClick(tag)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTag(tag.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManageTagsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DevSpace;