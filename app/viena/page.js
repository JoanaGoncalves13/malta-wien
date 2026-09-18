"use client";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import AuthForm from "@/components/AuthForm";
import Vienna from "@/components/Vienna";
import SetupMissing from "@/components/SetupMissing";

export default function ViennaPage() {
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
  return <Vienna session={session} />;
}
