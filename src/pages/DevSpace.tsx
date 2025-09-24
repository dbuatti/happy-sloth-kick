import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Code, Filter, X, ListRestart } from 'lucide-react';
import { useDevIdeas, DevIdea, DevIdeaTag } from '@/hooks/useDevIdeas';
import DevIdeaForm from '@/components/DevIdeaForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DndContext, closestCorners, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';
import { arrayMove } from '@dnd-kit/sortable';
import { showSuccess, showError } from '@/utils/toast';
import TagInput from '@/components/TagInput';
import { getRandomTagColor } from '@/lib/tagColors';

interface DevSpaceProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DevSpace: React.FC<DevSpaceProps> = ({ isDemo = false, demoUserId }) => {
  const {
    ideas,
    tags,
    loading,
    addIdea,
    updateIdea,
    deleteIdea,
    setIdeas,
    addTag,
  } = useDevIdeas({ userId: demoUserId });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [ideaToDeleteId, setIdeaToDeleteId] = useState<string | null>(null);
  const [ideaToDeleteTitle, setIdeaToDeleteTitle] = useState<string | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTagFilters, setSelectedTagFilters] = useState<DevIdeaTag[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filteredIdeas = useMemo(() => {
    let filtered = ideas;

    if (searchFilter) {
      filtered = filtered.filter(idea =>
        idea.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        idea.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        idea.local_file_path?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        idea.tags.some(tag => tag.name.toLowerCase().includes(searchFilter.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(idea => idea.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(idea => idea.priority === priorityFilter);
    }

    if (selectedTagFilters.length > 0) {
      const selectedTagIds = new Set(selectedTagFilters.map(tag => tag.id));
      filtered = filtered.filter(idea =>
        idea.tags.some(tag => selectedTagIds.has(tag.id))
      );
    }

    return filtered;
  }, [ideas, searchFilter, statusFilter, priorityFilter, selectedTagFilters]);

  const handleOpenForm = (idea: DevIdea | null) => {
    setEditingIdea(idea);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingIdea(null);
  };

  const handleSaveIdea = async (ideaData: Parameters<typeof addIdea>[0]) => {
    if (editingIdea) {
      await updateIdea({ id: editingIdea.id, updates: ideaData });
    } else {
      await addIdea(ideaData);
    }
    return true;
  };

  const handleDeleteClick = (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      setIdeaToDeleteId(ideaId);
      setIdeaToDeleteTitle(idea.title);
      setShowConfirmDeleteDialog(true);
    }
  };

  const confirmDeleteIdea = async () => {
    if (ideaToDeleteId) {
      await deleteIdea(ideaToDeleteId);
      setShowConfirmDeleteDialog(false);
      setIdeaToDeleteId(null);
      setIdeaToDeleteTitle(null);
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setIdeas((currentIdeas) => {
      const oldIndex = currentIdeas.findIndex((idea) => idea.id === active.id);
      const newIndex = currentIdeas.findIndex((idea) => idea.id === over.id);
      return arrayMove(currentIdeas, oldIndex, newIndex);
    });
  }, [setIdeas]);

  const clearAllFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSelectedTagFilters([]);
    setShowAdvancedFilters(false);
  };

  const isAnyFilterActive = searchFilter !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || selectedTagFilters.length > 0;

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Code className="h-7 w-7 text-primary" /> Dev Space
        </h1>
        <Button onClick={() => handleOpenForm(null)} disabled={isDemo}>
          <Plus className="mr-2 h-4 w-4" /> Add Idea
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 px-0 py-3 mb-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search ideas..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-3 h-9"
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
          <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
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
                  <TagInput
                    allTags={tags}
                    selectedTags={selectedTagFilters}
                    setSelectedTags={setSelectedTagFilters}
                    onAddTag={async (name, color) => {
                      const newTag = await addTag({ name, color });
                      if (newTag) {
                        showSuccess('Tag created!');
                      } else {
                        showError('Failed to create tag.');
                      }
                      return newTag;
                    }}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {isAnyFilterActive && (
            <Button variant="outline" onClick={clearAllFilters} className="gap-2 h-9">
              <ListRestart className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
          <Code className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No ideas found.</p>
          <p className="text-sm">Try adjusting your filters or add a new idea!</p>
        </div>
      ) : (
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredIdeas.map(idea => idea.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 gap-4">
              {filteredIdeas.map(idea => (
                <SortableDevIdeaCard key={idea.id} idea={idea} onEdit={handleOpenForm} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <DevIdeaForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveIdea}
        initialData={editingIdea}
        allTags={tags}
        onAddTag={async (name, color) => {
          const newTag = await addTag({ name, color });
          if (newTag) {
            showSuccess('Tag created!');
          } else {
            showError('Failed to create tag.');
          }
          return newTag;
        }}
      />

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the idea "{ideaToDeleteTitle}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteIdea}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default DevSpace;