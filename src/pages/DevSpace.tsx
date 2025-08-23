import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDevIdeas } from '@/hooks/useDevIdeas';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Tag, Edit, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDevIdeaCard } from '@/components/SortableDevIdeaCard';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface IdeaColumnProps {
  id: string;
  title: string;
  ideas: DevIdea[];
  className?: string;
  loading: boolean;
  onEditIdea: (idea: DevIdea) => void;
  onDeleteIdea: (id: string) => void;
}

const IdeaColumn: React.FC<IdeaColumnProps> = ({ id, title, ideas, className, loading, onEditIdea, onDeleteIdea }) => {
  return (
    <Card className={cn("w-full min-h-[300px] flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          {title} <Badge variant="secondary">{ideas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500">Loading ideas...</div>
        ) : ideas.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No ideas here yet.</div>
        ) : (
          <SortableContext items={ideas.map(idea => idea.id)} strategy={verticalListSortingStrategy}>
            {ideas.map(idea => (
              <SortableDevIdeaCard
                key={idea.id}
                idea={idea}
                onEdit={onEditIdea}
                onDelete={onDeleteIdea}
              />
            ))}
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
};

const DevSpace = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { ideas: fetchedIdeas, tags: fetchedTags, isLoading, error, addIdea, updateIdea, deleteIdea, createTag, updateTag, deleteTag } = useDevIdeas();

  const [ideas, setIdeas] = useState<DevIdea[]>([]);
  const [tags, setTags] = useState<DevIdeaTag[]>([]);

  const [isAddIdeaDialogOpen, setIsAddIdeaDialogOpen] = useState(false);
  const [isEditIdeaDialogOpen, setIsEditIdeaDialogOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDescription, setNewIdeaDescription] = useState<string | null>(null);
  const [newIdeaStatus, setNewIdeaStatus] = useState<DevIdea['status']>('idea');
  const [newIdeaPriority, setNewIdeaPriority] = useState('medium');
  const [newIdeaTagIds, setNewIdeaTagIds] = useState<string[]>([]);
  const [activeIdea, setActiveIdea] = useState<DevIdea | null>(null);

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#60a5fa'); // Default blue
  const [editingTag, setEditingTag] = useState<DevIdeaTag | null>(null);

  useEffect(() => {
    if (fetchedIdeas) {
      setIdeas(fetchedIdeas);
    }
  }, [fetchedIdeas]);

  useEffect(() => {
    if (fetchedTags) {
      setTags(fetchedTags);
    }
  }, [fetchedTags]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const columns = useMemo(() => ({
    'idea': ideas.filter(idea => idea.status === 'idea'),
    'in-progress': ideas.filter(idea => idea.status === 'in-progress'),
    'completed': ideas.filter(idea => idea.status === 'completed'),
  }), [ideas]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveIdea(ideas.find(idea => idea.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = String(active.data.current?.sortable.containerId);
    const overContainer = String(over.data.current?.sortable.containerId);

    if (activeContainer === overContainer) {
      setIdeas(prev => {
        const currentColumn = prev.filter(idea => idea.status === activeContainer);
        const oldIndex = currentColumn.findIndex(idea => idea.id === activeId);
        const newIndex = currentColumn.findIndex(idea => idea.id === overId);
        const newOrder = arrayMove(currentColumn, oldIndex, newIndex);

        // Merge back into the full ideas list, maintaining order within the column
        const updatedIdeas = prev.map(idea => {
          const orderedIdea = newOrder.find(ni => ni.id === idea.id);
          return orderedIdea || idea;
        });
        return updatedIdeas;
      });
    } else {
      // Moving between columns
      const draggedIdea = ideas.find(idea => idea.id === activeId);
      if (draggedIdea) {
        const newStatus = overContainer as DevIdea['status'];
        await updateIdea({ id: draggedIdea.id, updates: { status: newStatus } });
        setIdeas(prev => prev.map(idea =>
          idea.id === activeId ? { ...idea, status: newStatus } : idea
        ));
      }
    }
    setActiveIdea(null);
  };

  const handleOpenAddIdeaDialog = () => {
    setNewIdeaTitle('');
    setNewIdeaDescription(null);
    setNewIdeaStatus('idea');
    setNewIdeaPriority('medium');
    setNewIdeaTagIds([]);
    setIsAddIdeaDialogOpen(true);
  };

  const handleAddIdea = async () => {
    if (newIdeaTitle.trim()) {
      try {
        await addIdea({
          title: newIdeaTitle,
          description: newIdeaDescription,
          status: newIdeaStatus,
          priority: newIdeaPriority,
          tagIds: newIdeaTagIds,
        });
        setIsAddIdeaDialogOpen(false);
        toast.success('Idea added successfully!');
      } catch (err: any) {
        toast.error(`Failed to add idea: ${err.message}`);
      }
    }
  };

  const handleOpenEditIdeaDialog = (idea: DevIdea) => {
    setActiveIdea(idea);
    setNewIdeaTitle(idea.title);
    setNewIdeaDescription(idea.description);
    setNewIdeaStatus(idea.status);
    setNewIdeaPriority(idea.priority);
    setNewIdeaTagIds(idea.tags.map(tag => tag.id));
    setIsEditIdeaDialogOpen(true);
  };

  const handleUpdateIdea = async () => {
    if (activeIdea && newIdeaTitle.trim()) {
      try {
        await updateIdea({
          id: activeIdea.id,
          updates: {
            title: newIdeaTitle,
            description: newIdeaDescription,
            status: newIdeaStatus,
            priority: newIdeaPriority,
            tagIds: newIdeaTagIds,
          },
        });
        setIsEditIdeaDialogOpen(false);
        setActiveIdea(null);
        toast.success('Idea updated successfully!');
      } catch (err: any) {
        toast.error(`Failed to update idea: ${err.message}`);
      }
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this idea?')) {
      try {
        await deleteIdea(id);
        toast.success('Idea deleted successfully!');
      } catch (err: any) {
        toast.error(`Failed to delete idea: ${err.message}`);
      }
    }
  };

  const handleOpenTagModal = (tag?: DevIdeaTag) => {
    if (tag) {
      setEditingTag(tag);
      setNewTagName(tag.name);
      setNewTagColor(tag.color);
    } else {
      setEditingTag(null);
      setNewTagName('');
      setNewTagColor('#60a5fa');
    }
    setIsTagModalOpen(true);
  };

  const handleSaveTag = async () => {
    if (newTagName.trim()) {
      try {
        if (editingTag) {
          await updateTag({ id: editingTag.id, updates: { name: newTagName, color: newTagColor } });
          toast.success('Tag updated successfully!');
        } else {
          await createTag({ name: newTagName, color: newTagColor });
          toast.success('Tag created successfully!');
        }
        setIsTagModalOpen(false);
      } catch (err: any) {
        toast.error(`Failed to save tag: ${err.message}`);
      }
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (window.confirm('Deleting a tag will remove it from all ideas. Are you sure?')) {
      try {
        await deleteTag(id);
        setIsTagModalOpen(false);
        toast.success('Tag deleted successfully!');
      } catch (err: any) {
        toast.error(`Failed to delete tag: ${err.message}`);
      }
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading Dev Space...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Dev Space</h1>

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Button onClick={handleOpenAddIdeaDialog}>
            <Plus className="h-4 w-4 mr-2" /> Add New Idea
          </Button>
          <Button variant="outline" onClick={() => handleOpenTagModal()}>
            <Tag className="h-4 w-4 mr-2" /> Manage Tags
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
          {Object.keys(columns).map((columnId) => (
            <IdeaColumn
              key={columnId}
              id={columnId}
              title={columnId.charAt(0).toUpperCase() + columnId.slice(1).replace('-', ' ')}
              className={columnId === 'idea' ? 'bg-blue-50' : columnId === 'in-progress' ? 'bg-yellow-50' : 'bg-green-50'}
              ideas={columns[columnId as keyof typeof columns] as DevIdea[]}
              loading={isLoading}
              onEditIdea={handleOpenEditIdeaDialog}
              onDeleteIdea={handleDeleteIdea}
            />
          ))}
        </div>
      </DndContext>

      {/* Add/Edit Idea Dialog */}
      <Dialog open={isAddIdeaDialogOpen || isEditIdeaDialogOpen} onOpenChange={isEditIdeaDialogOpen ? setIsEditIdeaDialogOpen : setIsAddIdeaDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{activeIdea ? 'Edit Idea' : 'Add New Idea'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" value={newIdeaTitle} onChange={(e) => setNewIdeaTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea id="description" value={newIdeaDescription || ''} onChange={(e) => setNewIdeaDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={newIdeaStatus} onValueChange={(value: DevIdea['status']) => setNewIdeaStatus(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">Priority</Label>
              <Select value={newIdeaPriority} onValueChange={setNewIdeaPriority}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tags" className="text-right">Tags</Label>
              <Select
                multiple
                value={newIdeaTagIds}
                onValueChange={(values: string[]) => setNewIdeaTagIds(values)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select tags">
                    {newIdeaTagIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {newIdeaTagIds.map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">{tag.name}</Badge> : null;
                        })}
                      </div>
                    ) : 'Select tags'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }}></span>
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {activeIdea && (
              <Button variant="destructive" onClick={() => handleDeleteIdea(activeIdea.id)}>Delete</Button>
            )}
            <Button type="submit" onClick={activeIdea ? handleUpdateIdea : handleAddIdea}>
              {activeIdea ? 'Save Changes' : 'Add Idea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Tags Modal */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Edit Tag' : 'Add New Tag'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagName" className="text-right">Name</Label>
              <Input id="tagName" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagColor" className="text-right">Color</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input id="tagColor" type="text" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="flex-grow" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-8 p-0" style={{ backgroundColor: newTagColor }}></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <HexColorPicker color={newTagColor} onChange={setNewTagColor} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <h4 className="font-semibold">Existing Tags:</h4>
              {tags.length === 0 ? (
                <p className="text-sm text-gray-500">No tags created yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      style={{ backgroundColor: tag.color }}
                      className="text-white cursor-pointer hover:opacity-80 flex items-center gap-1"
                      onClick={() => handleOpenTagModal(tag)}
                    >
                      {tag.name}
                      <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id); }} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            {editingTag && (
              <Button variant="destructive" onClick={() => handleDeleteTag(editingTag.id)}>Delete Tag</Button>
            )}
            <Button type="submit" onClick={handleSaveTag}>
              {editingTag ? 'Save Changes' : 'Add Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DevSpace;