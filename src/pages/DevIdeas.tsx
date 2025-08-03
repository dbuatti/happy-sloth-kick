import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { useDevIdeas, DevIdea } from '@/hooks/useDevIdeas';
import DevIdeaColumn from '@/components/DevIdeaColumn';
import DevIdeaForm from '@/components/DevIdeaForm';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Lightbulb } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Skeleton } from '@/components/ui/skeleton';

const DevIdeas: React.FC = () => {
  const { ideas, loading, addIdea, updateIdea, reorderIdeas } = useDevIdeas();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);
  const [activeIdea, setActiveIdea] = useState<DevIdea | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = useMemo(() => {
    return {
      idea: ideas.filter(i => i.status === 'idea'),
      'in-progress': ideas.filter(i => i.status === 'in-progress'),
      completed: ideas.filter(i => i.status === 'completed'),
    };
  }, [ideas]);

  const handleEdit = (idea: DevIdea) => {
    setEditingIdea(idea);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingIdea(null);
    setIsFormOpen(true);
  };

  const handleSave = async (ideaData: Omit<DevIdea, 'id' | 'user_id' | 'created_at'>) => {
    if (editingIdea) {
      const result = await updateIdea(editingIdea.id, ideaData);
      return !!result;
    } else {
      const result = await addIdea(ideaData);
      return !!result;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const idea = ideas.find(i => i.id === active.id);
    if (idea) {
      setActiveIdea(idea);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdea = ideas.find(i => i.id === active.id);
    if (!activeIdea) return;

    const overIsColumn = Object.keys(columns).includes(String(over.id));
    if (overIsColumn) {
      const newStatus = String(over.id) as DevIdea['status'];
      if (activeIdea.status !== newStatus) {
        updateIdea(activeIdea.id, { status: newStatus });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIdea(null);

    if (!over || active.id === over.id) return;

    const overIsIdea = ideas.some(i => i.id === over.id);
    if (overIsIdea) {
      reorderIdeas(String(active.id), String(over.id));
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-primary" /> Dev Ideas
            </h1>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Plus className="mr-2 h-4 w-4" /> Add Idea
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingIdea ? 'Edit Idea' : 'Add New Idea'}</DialogTitle>
                </DialogHeader>
                <DevIdeaForm
                  idea={editingIdea}
                  onSave={handleSave}
                  onCancel={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="flex-1 h-96 rounded-xl" />
              <Skeleton className="flex-1 h-96 rounded-xl" />
              <Skeleton className="flex-1 h-96 rounded-xl" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex flex-col md:flex-row gap-6">
                <DevIdeaColumn id="idea" title="💡 Ideas" ideas={columns.idea} onEdit={handleEdit} />
                <DevIdeaColumn id="in-progress" title="🚀 In Progress" ideas={columns['in-progress']} onEdit={handleEdit} />
                <DevIdeaColumn id="completed" title="✅ Completed" ideas={columns.completed} onEdit={handleEdit} />
              </div>
              {createPortal(
                <DragOverlay>
                  {activeIdea ? <SortableDevIdeaCard idea={activeIdea} onEdit={() => {}} /> : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          )}
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default DevIdeas;