"use client";

import React from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Outlet } from 'react-router-dom';
import { supabase } from './client';

export const SupabaseLayout: React.FC = () => {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Outlet />
    </SessionContextProvider>
  );
};