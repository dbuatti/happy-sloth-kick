import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Trash2, Edit } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ProjectBalanceCardProps } from '@/types/props';
import { Project } from '@/types/task';

const ProjectBalanceCard: React.FC<ProjectBalanceCardProps> = ({
  project,
  onIncrement,
  onDecrement,
  onDelete,
  onEditNotes,
  totalCount,
}) => {
  const progressValue = totalCount > 0 ? (project.current_count / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{project.name}</CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={() => onEditNotes(project)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(project.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm block">
            {project.link}
          </a>
        )}
        <div className="flex items-center space-x-2 mt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDecrement(project.id)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Progress value={progressValue} className="flex-grow h-2" />
          <span className="text-sm font-medium">{project.current_count}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onIncrement(project.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectBalanceCard;