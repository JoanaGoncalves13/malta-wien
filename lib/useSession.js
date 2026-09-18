"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// undefined = a carregar · null = sem login · objeto = com login
export function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return session;
}
