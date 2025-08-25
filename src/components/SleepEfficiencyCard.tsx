"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, CheckCircle, XCircle } from "lucide-react";

const SleepEfficiencyCard: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["weeklySleepEfficiency", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("get_weekly_sleep_efficiency", { p_user_id: userId });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Weekly Sleep Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading sleep efficiency...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Weekly Sleep Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load sleep efficiency: {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const efficiency = data || 0;
  const targetEfficiency = 85;
  const isMeetingTarget = efficiency >= targetEfficiency;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Weekly Sleep Efficiency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">
            Current: <span className="text-primary">{efficiency}%</span>
          </p>
          <p className="text-sm text-muted-foreground">Target: {targetEfficiency}%</p>
        </div>
        <Progress value={efficiency} max={100} className="h-3" />
        {efficiency === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Data</AlertTitle>
            <AlertDescription>
              Log your sleep records for the past week to see your sleep efficiency.
            </AlertDescription>
          </Alert>
        )}
        {efficiency > 0 && (
          <Alert variant={isMeetingTarget ? "default" : "warning"}>
            {isMeetingTarget ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            <AlertTitle>{isMeetingTarget ? "Great Job!" : "Keep Going!"}</AlertTitle>
            <AlertDescription>
              {isMeetingTarget
                ? `You are meeting your sleep efficiency target of ${targetEfficiency}%!`
                : `Your current sleep efficiency is below the target of ${targetEfficiency}%. Let's work on improving it!`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SleepEfficiencyCard;