import React from 'react';

interface ProjectsProps {
  isDemo?: boolean;
  demoUserId?: string | null;
}

const Projects: React.FC<ProjectsProps> = ({ isDemo = false, demoUserId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-3xl font-bold mb-4">Projects Page</h1>
      <p className="text-muted-foreground">This is a placeholder for the Projects page.</p>
      {isDemo && <p className="text-sm text-muted-foreground mt-2">Demo Mode: User ID - {demoUserId}</p>}
    </div>
  );
};

export default Projects;