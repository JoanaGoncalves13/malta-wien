"use client";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import AuthForm from "@/components/AuthForm";
import Dashboard from "@/components/Dashboard";
import SetupMissing from "@/components/SetupMissing";

export default function Home() {
  const session = useSession();

  if (!supabase) return <SetupMissing />;
  if (session === undefined) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }
  if (!session) return <AuthForm />;
  return <Dashboard session={session} />;
}
