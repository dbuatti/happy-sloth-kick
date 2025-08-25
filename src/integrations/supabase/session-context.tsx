"use client";

import React from "react";
import { SessionContextProvider as SupabaseSessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "./client";

interface SessionContextProviderProps {
  children: React.ReactNode;
}

export const SessionContextProvider: React.FC<SessionContextProviderProps> = ({ children }) => {
  return (
    <SupabaseSessionContextProvider supabaseClient={supabase}>
      {children}
    </SupabaseSessionContextProvider>
  );
};