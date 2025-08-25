"use client";

import React from "react";
import SleepEfficiencyCard from "@/components/SleepEfficiencyCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SleepDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-6">Sleep Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SleepEfficiencyCard />
        
        {/* Placeholder for other sleep-related cards */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sleep Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Coming soon: Detailed sleep trends and graphs.</p>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sleep Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Coming soon: Set and track your sleep goals.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SleepDashboard;