import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Code, Search, Filter, X, ListRestart } from 'lucide-react';
import { useDevIdeas, DevIdea, DevIdeaTag } from '@/hooks/useDevIdeas';
import DevIdeaForm from '@/components/DevIdeaForm';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';
import { getRandomTagColor } from '@/lib/tagColors'; // Corrected import

interface DevSpaceProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DevSpace: React.FC<DevSpaceProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { ideas, tags, loading, addIdea, updateIdea, deleteIdea, setIdeas, addTag } = useDevIdeas({ userId: demoUserId });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeIdeaData, setActiveIdeaData] = useState<DevIdea | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isDemo,
    })
  );

  const filteredIdeas = useMemo(() => {
    let filtered = ideas;

    if (searchFilter) {
      filtered = filtered.filter(idea =>
        idea.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        idea.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        idea.local_file_path?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        idea.tags.some((tag: DevIdeaTag) => tag.name.toLowerCase().includes(searchFilter.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(idea => idea.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(idea => idea.priority === priorityFilter);
    }

    if (selectedTagIds.size > 0) {
      filtered = filtered.filter(idea =>
        idea.tags.some((tag: DevIdeaTag) => selectedTagIds.has(tag.id))
      );
    }

    return filtered;
  }, [ideas, searchFilter, statusFilter, priorityFilter, selectedTagIds]);

  const handleOpenForm = (idea: DevIdea | null) => {
    setEditingIdea(idea);
    setIsFormOpen(true);
  };

  const handleSaveIdea = async (data: Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'tags'> & { tagIds: string[] }) => {
    if (editingIdea) {
      await updateIdea({ id: editingIdea.id, updates: data });
    } else {
      await addIdea(data);
    }
    setIsFormOpen(false);
  };

  const handleClearFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSelectedTagIds(new Set());
    setShowAdvanced(false);
  };

  const isAnyFilterActive = searchFilter !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || selectedTagIds.size > 0;

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setActiveIdeaData(ideas.find(idea => idea.id === event.active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveIdeaData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setIdeas((currentIdeas: DevIdea[]) => {
      const oldIndex = currentIdeas.findIndex((idea: DevIdea) => idea.id === active.id);
      const newIndex = currentIdeas.findIndex((idea: DevIdea) => idea.id === over.id);
      return arrayMove(currentIdeas, oldIndex, newIndex);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <Code className="inline-block h-10 w-10 mr-3 text-primary" /> Dev Space
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 px-4 py-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search ideas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 h-9"
            />
            {searchFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchFilter('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 h-9">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="idea">Idea</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Button
                          key={tag.id}
                          variant={selectedTagIds.has(tag.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleTagToggle(tag.id)}
                          style={selectedTagIds.has(tag.id) ? { backgroundColor: tag.color, color: 'white' } : {}}
                        >
                          {tag.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {isAnyFilterActive && (
              <Button variant="outline" onClick={handleClearFilters} className="gap-2 h-9">
                <ListRestart className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => handleOpenForm(null)} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add New Idea
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full shadow-md rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-1/4" />
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6" />
              </Card>
            ))}
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Code className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">No ideas found.</p>
            <p className="text-sm">Try adjusting your filters or add a new idea!</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredIdeas.map(idea => idea.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {filteredIdeas.map(idea => (
                  <SortableDevIdeaCard key={idea.id} idea={idea} onEdit={handleOpenForm} />
                ))}
              </div>
            </SortableContext>

            {createPortal(
              <DragOverlay dropAnimation={null}>
                {activeId && activeIdeaData && (
                  <div className="rotate-2">
                    <SortableDevIdeaCard idea={activeIdeaData} onEdit={handleOpenForm} />
                  </div>
                )}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
        )}
      </div>

      <DevIdeaForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveIdea}
        initialData={editingIdea}
        allTags={tags}
        onAddTag={addTag}
      />
    </div>
  );
};

export default DevSpace;