import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { ProjectBalanceCardProps } from '@/types/props';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/context/AuthContext';
import { Project } from '@/types/task';

const ProjectBalanceCard: React.FC<ProjectBalanceCardProps> = ({ projects, title }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    incrementProjectCount,
    decrementProjectCount,
    isLoading,
    error,
  } = useProjects({ userId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">Error loading projects.</CardContent>
      </Card>
    );
  }

  const totalCount = projects.reduce((sum: number, project: Project) => sum + project.current_count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-gray-500">No projects added yet.</p>
        ) : (
          projects.map((project: Project) => (
            <div key={project.id} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{project.name}</span>
                <span className="text-gray-600">{project.current_count}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => incrementProjectCount(project.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Progress value={(project.current_count / totalCount) * 100 || 0} className="flex-grow h-2" />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => decrementProjectCount(project.id)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectBalanceCard;