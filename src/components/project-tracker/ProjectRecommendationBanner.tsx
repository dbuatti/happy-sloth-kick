import React from 'react';
import { Project } from '@/hooks/useProjects';
import { Lightbulb } from 'lucide-react';

interface ProjectRecommendationBannerProps {
  project: Project | null;
}

const ProjectRecommendationBanner: React.FC<ProjectRecommendationBannerProps> = ({ project }) => {
  if (!project) return null;

  return (
    <div className="bg-primary/5 dark:bg-primary/10 text-primary p-4 rounded-xl mb-4 text-center flex flex-col items-center gap-2">
      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0" />
      <p className="text-sm text-foreground">
        Consider focusing on: <span className="font-semibold">{project.name}</span> (Current count: {project.current_count})
      </p>
    </div>
  );
};

export default ProjectRecommendationBanner;