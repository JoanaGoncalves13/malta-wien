"use client";

import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import AuthForm from "@/components/AuthForm";
import GroupView from "@/components/GroupView";
import SetupMissing from "@/components/SetupMissing";

export default function GroupPage() {
  const { id } = useParams();
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
  return <GroupView key={id} groupId={id} session={session} />;
}
