"use client";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import AuthForm from "@/components/AuthForm";
import Spending from "@/components/Spending";
import SetupMissing from "@/components/SetupMissing";

export default function SpendingPage() {
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
  return <Spending session={session} />;
}
