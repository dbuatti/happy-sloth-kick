import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { DevIdea } from '@/hooks/useDevIdeas';
import SortableDevIdeaCard from './SortableDevIdeaCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

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

export default DevIdeaColumn;