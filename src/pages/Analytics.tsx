import React from 'react';

interface AnalyticsProps {
  isDemo?: boolean;
  demoUserId?: string | null;
}

const Analytics: React.FC<AnalyticsProps> = ({ isDemo = false, demoUserId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-3xl font-bold mb-4">Analytics Page</h1>
      <p className="text-muted-foreground">This is a placeholder for the Analytics page.</p>
      {isDemo && <p className="text-sm text-muted-foreground mt-2">Demo Mode: User ID - {demoUserId}</p>}
    </div>
  );
};

export default Analytics;