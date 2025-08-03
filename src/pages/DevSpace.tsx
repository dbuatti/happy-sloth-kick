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
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableDevIdeaCard from '@/components/SortableDevIdeaCard';

const DevSpace: React.FC = () => {
  const { ideas, loading, addIdea, updateIdea } = useDevIdeas();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);
  const [activeIdea, setActiveIdea] = useState<DevIdea | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

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

  const handleSave = async (data: Omit<DevIdea, 'id' | 'user_id' | 'created_at'>) => {
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

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeIdea = ideas.find(idea => idea.id === activeId);
    if (!activeIdea) return;

    // Find the container of the 'over' element. It could be a column or an item in a column.
    const overContainerId = over.data.current?.sortable?.containerId || over.id;

    let overStatus: DevIdea['status'] | null = null;
    if (['idea', 'in-progress', 'completed'].includes(overContainerId as string)) {
      overStatus = overContainerId as DevIdea['status'];
    }

    if (overStatus && activeIdea.status !== overStatus) {
      updateIdea(active.id as string, { status: overStatus });
    }
  };

  const columnData = [
    { id: 'idea', title: 'Ideas', icon: Lightbulb, className: 'text-yellow-500' },
    { id: 'in-progress', title: 'In Progress', icon: Zap, className: 'text-blue-500' },
    { id: 'completed', title: 'Completed', icon: CheckCircle2, className: 'text-green-500' },
  ];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Dev Space</h1>
            <Button onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" /> Add Idea
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columnData.map(column => {
              const Icon = column.icon;
              const columnIdeas = columns[column.id as keyof typeof columns];
              return (
                <div id={column.id} key={column.id}>
                  <Card className="bg-muted/30 h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className={column.className} /> {column.title} ({columnIdeas.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 min-h-[100px]">
                      <SortableContext id={column.id} items={columnIdeas.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {loading ? (
                          <Skeleton className="h-24 w-full" />
                        ) : (
                          columnIdeas.map(idea => <SortableDevIdeaCard key={idea.id} idea={idea} onEdit={handleEditClick} />)
                        )}
                      </SortableContext>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
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