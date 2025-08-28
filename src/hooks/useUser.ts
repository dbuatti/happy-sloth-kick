"use client";

import { useContext } from "react";
import { SessionContext } from "@/integrations/supabase/auth";

export const useUser = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a SessionContextProvider");
  }
  return context;
};