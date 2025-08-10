import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lightbulb, Zap, CheckCircle2 } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useDevIdeas, DevIdea } from '@/hooks/useDevIdeas';
import DevIdeaCard from '@/components/DevIdeaCard';
import DevIdeaForm from '@/components/DevIdeaForm';
import { Skeleton } from '@/components/ui/skeleton';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';
import { useDroppable } from '@dnd-kit/core';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';

interface DevIdeaColumnProps {
    id: string;
    title: string;
    icon: React.ElementType;
    className: string;
    ideas: DevIdea[];
    loading: boolean;
    onEdit: (idea: DevIdea) => void;
}

const DevIdeaColumn: React.FC<DevIdeaColumnProps> = ({ id, title, icon: Icon, className, ideas, loading, onEdit }) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <Card className="bg-muted/30 h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className={className} /> {title} ({ideas.length})
                </CardTitle>
            </CardHeader>
            <CardContent ref={setNodeRef} className="space-y-4 min-h-[200px]">
                <SortableContext id={id} items={ideas.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {loading ? (
                        <Skeleton className="h-24 w-full" />
                    ) : (
                        ideas.map(idea => <SortableDevIdeaCard key={idea.id} idea={idea} onEdit={onEdit} />)
                    )}
                </SortableContext>
            </CardContent>
        </Card>
    );
};

interface DevSpaceProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DevSpace: React.FC<DevSpaceProps> = ({ isDemo = false, demoUserId }) => {
  const { ideas, tags, loading, addIdea, updateIdea, setIdeas, addTag } = useDevIdeas({ userId: demoUserId });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);
  const [activeIdea, setActiveIdea] = useState<DevIdea | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  const columns = useMemo(() => {
    const ideaCol = ideas.filter(i => i.status === 'idea');
    const inProgressCol = ideas.filter(i => i.status === 'in-progress');
    const completedCol = ideas.filter(i => i.status === 'completed');
    return { idea: ideaCol, 'in-progress': inProgressCol, completed: completedCol };
  }, [ideas]);

  const handleAddClick = () => {
    setEditingIdea(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (idea: DevIdea) => {
    setEditingIdea(idea);
    setIsFormOpen(true);
  };

  const handleSave = async (data: Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'tags'> & { tagIds: string[] }) => {
    if (editingIdea) {
      return await updateIdea(editingIdea.id, data);
    } else {
      return await addIdea(data);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveIdea(ideas.find(idea => idea.id === active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIdea(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = active.data.current?.sortable.containerId;
    const overContainer = over.data.current?.sortable.containerId || over.id;

    if (!activeContainer || !overContainer) return;

    if (activeContainer !== overContainer) {
        const newStatus = overContainer as DevIdea['status'];
        if (['idea', 'in-progress', 'completed'].includes(newStatus)) {
            updateIdea(activeId, { status: newStatus });
        }
    } else if (activeId !== overId) {
        setIdeas((prev) => {
            const oldIndex = prev.findIndex((idea) => idea.id === activeId);
            const newIndex = prev.findIndex((idea) => idea.id === overId);
            if (oldIndex === -1 || newIndex === -1) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    }
  };

  const columnData = [
    { id: 'idea', title: 'Ideas', icon: Lightbulb, className: 'text-yellow-500' },
    { id: 'in-progress', title: 'In Progress', icon: Zap, className: 'text-blue-500' },
    { id: 'completed', title: 'Completed', icon: CheckCircle2, className: 'text-green-500' },
  ];

  const shortcuts: ShortcutMap = {
    'n': (e) => {
      e.preventDefault();
      handleAddClick();
    },
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Dev Space</h1>
            <Button onClick={handleAddClick} disabled={isDemo}>
              <Plus className="mr-2 h-4 w-4" /> Add Idea
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columnData.map(column => (
              <DevIdeaColumn
                key={column.id}
                id={column.id}
                title={column.title}
                icon={column.icon}
                className={column.className}
                ideas={columns[column.id as keyof typeof columns]}
                loading={loading}
                onEdit={handleEditClick}
              />
            ))}
          </div>
        </main>
        <footer className="p-4">
          <MadeWithDyad />
        </footer>

        <DevIdeaForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
          initialData={editingIdea}
          allTags={tags}
          onAddTag={addTag}
        />
      </div>
      {createPortal(
        <DragOverlay>
          {activeIdea ? (
            <DevIdeaCard idea={activeIdea} onEdit={() => {}} />
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default DevSpace;