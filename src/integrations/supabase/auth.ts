"use client";

import { useSession, useUser } from "@supabase/auth-helpers-react";

export const useAuth = () => {
  const session = useSession();
  const user = useUser();
  return { session, user };
};