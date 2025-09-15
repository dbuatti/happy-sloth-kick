import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCcw } from 'lucide-react';

interface ProjectCelebrationBannerProps {
  onResetAllClick: () => void;
  isResettingAll: boolean;
  isDemo: boolean;
}

const ProjectCelebrationBanner: React.FC<ProjectCelebrationBannerProps> = ({
  onResetAllClick,
  isResettingAll,
  isDemo,
}) => {
  return (
    <div className="bg-primary/5 dark:bg-primary/10 text-primary p-4 rounded-xl mb-4 text-center flex flex-col items-center gap-2">
      <Sparkles className="h-8 w-8 text-primary animate-bounce" />
      <p className="text-xl font-semibold">Congratulations! All projects are balanced!</p>
      <p>Ready to start a new cycle?</p>
      <Button onClick={onResetAllClick} className="mt-2 h-9" disabled={isResettingAll || isDemo}>
        {isResettingAll ? 'Resetting...' : <><RefreshCcw className="mr-2 h-4 w-4" /> Reset All Counters</>}
      </Button>
    </div>
  );
};

export default ProjectCelebrationBanner;