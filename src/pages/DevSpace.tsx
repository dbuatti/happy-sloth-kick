import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lightbulb, Zap, CheckCircle2 } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useDevIdeas, DevIdea } from '@/hooks/useDevIdeas';
import DevIdeaCard from '@/components/DevIdeaCard';
import DevIdeaForm from '@/components/DevIdeaForm';
import { Skeleton } from '@/components/ui/skeleton';

const DevSpace: React.FC = () => {
  const { ideas, loading, addIdea, updateIdea } = useDevIdeas();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);

  const columns = useMemo(() => {
    const ideaCol = ideas.filter(i => i.status === 'idea');
    const inProgressCol = ideas.filter(i => i.status === 'in-progress');
    const completedCol = ideas.filter(i => i.status === 'completed');
    return { ideaCol, inProgressCol, completedCol };
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

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dev Space</h1>
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" /> Add Idea
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Idea Column */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lightbulb className="text-yellow-500" /> Ideas ({columns.ideaCol.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                columns.ideaCol.map(idea => <DevIdeaCard key={idea.id} idea={idea} onEdit={handleEditClick} />)
              )}
            </CardContent>
          </Card>

          {/* In Progress Column */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="text-blue-500" /> In Progress ({columns.inProgressCol.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                columns.inProgressCol.map(idea => <DevIdeaCard key={idea.id} idea={idea} onEdit={handleEditClick} />)
              )}
            </CardContent>
          </Card>

          {/* Completed Column */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="text-green-500" /> Completed ({columns.completedCol.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                columns.completedCol.map(idea => <DevIdeaCard key={idea.id} idea={idea} onEdit={handleEditClick} />)
              )}
            </CardContent>
          </Card>
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
  );
};

export default DevSpace;