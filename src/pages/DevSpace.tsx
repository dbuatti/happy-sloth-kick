import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDevIdeas } from '@/hooks/useDevIdeas';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, DevSpaceProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Tag, X, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { getRandomTagColor } from '@/lib/tagColors';
import { MultiSelect } from '@/components/ui/multi-select'; // Assuming this component exists or will be created

interface IdeaColumnProps {
  title: string;
  ideas: DevIdea[];
  className?: string;
  loading: boolean;
  onEditIdea: (idea: DevIdea) => void;
  onDeleteIdea: (id: string) => void;
}

const IdeaColumn: React.FC<IdeaColumnProps> = ({ title, ideas, className, loading, onEditIdea, onDeleteIdea }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title} ({ideas.length})</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[100px] space-y-4">
        {loading ? (
          <p>Loading ideas...</p>
        ) : (
          <SortableContext items={ideas.map(idea => idea.id)} strategy={verticalListSortingStrategy}>
            {ideas.map((idea) => (
              <SortableDevIdeaCard key={idea.id} idea={idea} onEdit={onEditIdea} onDelete={onDeleteIdea} />
            ))}
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
};

const DevSpace: React.FC<DevSpaceProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { ideas: fetchedIdeas, tags: fetchedTags, isLoading, error, addIdea, updateIdea, deleteIdea, createTag, updateTag, deleteTag } = useDevIdeas();

  const [isAddIdeaDialogOpen, setIsAddIdeaDialogOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDescription, setNewIdeaDescription] = useState('');
  const [newIdeaStatus, setNewIdeaStatus] = useState('idea');
  const [newIdeaPriority, setNewIdeaPriority] = useState('medium');
  const [newIdeaImageUrl, setNewIdeaImageUrl] = useState('');
  const [newIdeaLocalFilePath, setNewIdeaLocalFilePath] = useState('');
  const [newIdeaTagIds, setNewIdeaTagIds] = useState<string[]>([]);

  const [isEditIdeaDialogOpen, setIsEditIdeaDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);
  const [editIdeaTitle, setEditIdeaTitle] = useState('');
  const [editIdeaDescription, setEditIdeaDescription] = useState('');
  const [editIdeaStatus, setEditIdeaStatus] = useState('');
  const [editIdeaPriority, setEditIdeaPriority] = useState('');
  const [editIdeaImageUrl, setEditIdeaImageUrl] = useState('');
  const [editIdeaLocalFilePath, setEditIdeaLocalFilePath] = useState('');
  const [editIdeaTagIds, setEditIdeaTagIds] = useState<string[]>([]);

  const [isManageTagsDialogOpen, setIsManageTagsDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(getRandomTagColor());
  const [editingTag, setEditingTag] = useState<DevIdeaTag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const ideasByStatus = useMemo(() => {
    const map = new Map<string, DevIdea[]>();
    ['idea', 'todo', 'in-progress', 'done', 'archived'].forEach(status => map.set(status, []));
    fetchedIdeas?.forEach(idea => {
      map.get(idea.status)?.push(idea);
    });
    return map;
  }, [fetchedIdeas]);

  const handleAddIdea = async () => {
    if (!newIdeaTitle.trim()) {
      toast.error('Idea title cannot be empty.');
      return;
    }
    try {
      const newIdeaData: NewDevIdeaData = {
        title: newIdeaTitle.trim(),
        description: newIdeaDescription.trim() || null,
        status: newIdeaStatus as 'idea' | 'todo' | 'in-progress' | 'done' | 'archived',
        priority: newIdeaPriority as 'none' | 'low' | 'medium' | 'high' | 'urgent',
        image_url: newIdeaImageUrl.trim() || null,
        local_file_path: newIdeaLocalFilePath.trim() || null,
        tagIds: newIdeaTagIds,
      };
      await addIdea(newIdeaData);
      toast.success('Idea added successfully!');
      setNewIdeaTitle('');
      setNewIdeaDescription('');
      setNewIdeaStatus('idea');
      setNewIdeaPriority('medium');
      setNewIdeaImageUrl('');
      setNewIdeaLocalFilePath('');
      setNewIdeaTagIds([]);
      setIsAddIdeaDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to add idea: ${(err as Error).message}`);
      console.error('Error adding idea:', err);
    }
  };

  const handleEditIdea = (idea: DevIdea) => {
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

  const handleUpdateIdea = async () => {
    if (!editingIdea || !editIdeaTitle.trim()) {
      toast.error('Idea title cannot be empty.');
      return;
    }
    try {
      const updates: UpdateDevIdeaData = {
        title: editIdeaTitle.trim(),
        description: editIdeaDescription.trim() || null,
        status: editIdeaStatus as 'idea' | 'todo' | 'in-progress' | 'done' | 'archived',
        priority: editIdeaPriority as 'none' | 'low' | 'medium' | 'high' | 'urgent',
        image_url: editIdeaImageUrl.trim() || null,
        local_file_path: editIdeaLocalFilePath.trim() || null,
        tagIds: editIdeaTagIds,
      };
      await updateIdea({ id: editingIdea.id, updates });
      toast.success('Idea updated successfully!');
      setIsEditIdeaDialogOpen(false);
      setEditingIdea(null);
    } catch (err) {
      toast.error(`Failed to update idea: ${(err as Error).message}`);
      console.error('Error updating idea:', err);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (window.confirm('Are you sure you want to delete this idea?')) {
      try {
        await deleteIdea(ideaId);
        toast.success('Idea deleted successfully!');
      } catch (err) {
        toast.error(`Failed to delete idea: ${(err as Error).message}`);
        console.error('Error deleting idea:', err);
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
      };
      await createTag(newTagData);
      toast.success('Tag created successfully!');
      setNewTagName('');
      setNewTagColor(getRandomTagColor());
    } catch (err) {
      toast.error(`Failed to create tag: ${(err as Error).message}`);
      console.error('Error creating tag:', err);
    }
  };

  const handleEditTag = (tag: DevIdeaTag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editTagName.trim()) {
      toast.error('Tag name cannot be empty.');
      return;
    }
    try {
      const updates: UpdateDevIdeaTagData = {
        name: editTagName.trim(),
        color: editTagColor,
      };
      await updateTag({ id: editingTag.id, updates });
      toast.success('Tag updated successfully!');
      setEditingTag(null);
    } catch (err) {
      toast.error(`Failed to update tag: ${(err as Error).message}`);
      console.error('Error updating tag:', err);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (window.confirm('Are you sure you want to delete this tag?')) {
      try {
        await deleteTag(tagId);
        toast.success('Tag deleted successfully!');
      } catch (err) {
        toast.error(`Failed to delete tag: ${(err as Error).message}`);
        console.error('Error deleting tag:', err);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeIdea = fetchedIdeas?.find(idea => idea.id === activeId);
    const overIdea = fetchedIdeas?.find(idea => idea.id === overId);

    if (activeIdea && overIdea) {
      // Logic to reorder within a column or move between columns
      // For simplicity, we'll just log for now.
      toast(`Idea ${activeId} dragged from ${activeIdea.status} to ${overIdea.status}. Reordering logic to be implemented.`);
    }
  };

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-full">Loading Dev Space...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dev Space</h1>

      <div className="flex justify-between items-center mb-6">
        <Dialog open={isAddIdeaDialogOpen} onOpenChange={setIsAddIdeaDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New Idea
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Idea</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newIdeaTitle" className="text-right">Title</Label>
                <Input id="newIdeaTitle" value={newIdeaTitle} onChange={(e) => setNewIdeaTitle(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newIdeaDescription" className="text-right">Description</Label>
                <Textarea id="newIdeaDescription" value={newIdeaDescription} onChange={(e) => setNewIdeaDescription(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newIdeaStatus" className="text-right">Status</Label>
                <Select value={newIdeaStatus} onValueChange={setNewIdeaStatus}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newIdeaPriority" className="text-right">Priority</Label>
                <Select value={newIdeaPriority} onValueChange={setNewIdeaPriority}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newIdeaImageUrl" className="text-right">Image URL</Label>
                <Input id="newIdeaImageUrl" value={newIdeaImageUrl} onChange={(e) => setNewIdeaImageUrl(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newIdeaLocalFilePath" className="text-right">Local File Path</Label>
                <Input id="newIdeaLocalFilePath" value={newIdeaLocalFilePath} onChange={(e) => setNewIdeaLocalFilePath(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newIdeaTags" className="text-right">Tags</Label>
                <MultiSelect
                  options={tags?.map(tag => ({ label: tag.name, value: tag.id })) || []}
                  value={newIdeaTagIds}
                  onValueChange={(values: string[]) => setNewIdeaTagIds(values)}
                  placeholder="Select tags"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddIdea}>Save Idea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={() => setIsManageTagsDialogOpen(true)}>
          <Tag className="mr-2 h-4 w-4" /> Manage Tags
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <IdeaColumn
            title="Ideas"
            ideas={ideasByStatus.get('idea') || []}
            className="bg-blue-50 dark:bg-blue-950"
            loading={isLoading}
            onEditIdea={handleEditIdea}
            onDeleteIdea={handleDeleteIdea}
          />
          <IdeaColumn
            title="To Do"
            ideas={ideasByStatus.get('todo') || []}
            className="bg-yellow-50 dark:bg-yellow-950"
            loading={isLoading}
            onEditIdea={handleEditIdea}
            onDeleteIdea={handleDeleteIdea}
          />
          <IdeaColumn
            title="In Progress"
            ideas={ideasByStatus.get('in-progress') || []}
            className="bg-purple-50 dark:bg-purple-950"
            loading={isLoading}
            onEditIdea={handleEditIdea}
            onDeleteIdea={handleDeleteIdea}
          />
          <IdeaColumn
            title="Done"
            ideas={ideasByStatus.get('done') || []}
            className="bg-green-50 dark:bg-green-950"
            loading={isLoading}
            onEditIdea={handleEditIdea}
            onDeleteIdea={handleDeleteIdea}
          />
          <IdeaColumn
            title="Archived"
            ideas={ideasByStatus.get('archived') || []}
            className="bg-gray-50 dark:bg-gray-950"
            loading={isLoading}
            onEditIdea={handleEditIdea}
            onDeleteIdea={handleDeleteIdea}
          />
        </div>
      </DndContext>

      {/* Edit Idea Dialog */}
      <Dialog open={isEditIdeaDialogOpen} onOpenChange={setIsEditIdeaDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Idea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editIdeaTitle" className="text-right">Title</Label>
              <Input id="editIdeaTitle" value={editIdeaTitle} onChange={(e) => setEditIdeaTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editIdeaDescription" className="text-right">Description</Label>
              <Textarea id="editIdeaDescription" value={editIdeaDescription} onChange={(e) => setEditIdeaDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editIdeaStatus" className="text-right">Status</Label>
              <Select value={editIdeaStatus} onValueChange={setEditIdeaStatus}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editIdeaPriority" className="text-right">Priority</Label>
              <Select value={editIdeaPriority} onValueChange={setEditIdeaPriority}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editIdeaImageUrl" className="text-right">Image URL</Label>
              <Input id="editIdeaImageUrl" value={editIdeaImageUrl} onChange={(e) => setEditIdeaImageUrl(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editIdeaLocalFilePath" className="text-right">Local File Path</Label>
              <Input id="editIdeaLocalFilePath" value={editIdeaLocalFilePath} onChange={(e) => setEditIdeaLocalFilePath(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editIdeaTags" className="text-right">Tags</Label>
              <MultiSelect
                options={tags?.map(tag => ({ label: tag.name, value: tag.id })) || []}
                value={editIdeaTagIds}
                onValueChange={(values: string[]) => setEditIdeaTagIds(values)}
                placeholder="Select tags"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateIdea}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Tags Dialog */}
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
                className="flex-grow"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" style={{ backgroundColor: newTagColor }}>
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: newTagColor }} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <HexColorPicker color={newTagColor} onChange={setNewTagColor} />
                </PopoverContent>
              </Popover>
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" style={{ backgroundColor: editTagColor }}>
                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: editTagColor }} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <HexColorPicker color={editTagColor} onChange={setEditTagColor} />
                        </PopoverContent>
                      </Popover>
                      <Button onClick={handleUpdateTag} size="sm">Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingTag(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Badge style={{ backgroundColor: tag.color }} className="text-white flex-grow">
                        {tag.name}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditTag(tag)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTag(tag.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DevSpace;