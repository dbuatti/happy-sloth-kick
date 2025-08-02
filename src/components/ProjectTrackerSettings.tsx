import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from '@/hooks/useProjects';
import { LayoutGrid, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
// Removed useAuth as it's not directly used in this component

const ProjectTrackerSettings: React.FC = () => {
  // Removed userId as it's not directly used in this component's logic
  // const { user } = useAuth(); 
  // const userId = user?.id; 

  const { sectionTitle, updateProjectTrackerTitle, loading: projectsLoading } = useProjects();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempSectionTitle, setTempSectionTitle] = useState(sectionTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  useEffect(() => {
    setTempSectionTitle(sectionTitle);
  }, [sectionTitle]);

  const handleSaveTitle = async () => {
    if (tempSectionTitle.trim()) {
      setIsSavingTitle(true);
      await updateProjectTrackerTitle(tempSectionTitle.trim());
      setIsSavingTitle(false);
      setIsEditingTitle(false);
    }
  };

  if (projectsLoading) {
    return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" /> Project Tracker Title
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-primary" /> Project Tracker Title
        </CardTitle>
        <p className="text-sm text-muted-foreground">Customize the title of your Project Balance Tracker.</p>
      </CardHeader>
      <CardContent className="pt-0">
        {isEditingTitle ? (
          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="project-tracker-title" className="text-sm font-medium text-foreground">New Title</Label>
              <Input
                id="project-tracker-title"
                value={tempSectionTitle}
                onChange={(e) => setTempSectionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                disabled={isSavingTitle}
                className="h-10 text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveTitle} disabled={isSavingTitle || !tempSectionTitle.trim()} className="h-10 text-base">
                {isSavingTitle ? 'Saving...' : 'Save Title'}
              </Button>
              <Button variant="outline" onClick={() => setIsEditingTitle(false)} disabled={isSavingTitle} className="h-10 text-base">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium text-foreground">{sectionTitle}</p>
            <Button variant="outline" size="sm" onClick={() => setIsEditingTitle(true)} className="h-9 text-base">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectTrackerSettings;