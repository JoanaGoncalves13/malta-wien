"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/money";
import Header from "./Header";
import { useLang } from "@/lib/i18n/LanguageProvider";

function BalanceText({ value, t }) {
  if (value > 0.004) return <span className="pos">{t("groups.youGet", { amount: eur(value) })}</span>;
  if (value < -0.004) return <span className="neg">{t("groups.youOwe", { amount: eur(-value) })}</span>;
  return <span className="muted">{t("groups.settled")}</span>;
}

export default function Groups({ session }) {
  const router = useRouter();
  const me = session.user.id;
  const { t } = useLang();

  const [groups, setGroups] = useState(null);
  const [myName, setMyName] = useState("");
  const [newName, setNewName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [groupsRes, profileRes] = await Promise.all([
      supabase.from("groups").select("id, name, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("display_name").eq("id", me).maybeSingle(),
    ]);

    if (groupsRes.error) {
      setError(groupsRes.error.message);
      setGroups([]);
      return;
    }
    setMyName(profileRes.data?.display_name ?? "");

    const withBalance = await Promise.all(
      (groupsRes.data ?? []).map(async (group) => {
        const { data } = await supabase.rpc("group_balances", { p_group_id: group.id });
        const mine = data?.find((b) => b.user_id === me);
        return { ...group, balance: Number(mine?.balance ?? 0) };
      })
    );
    setGroups(withBalance);
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  async function createGroup(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("create_group", { p_name: newName });
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/grupo/${data.id}`);
  }

  async function joinGroup(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("join_group", { p_code: code });
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/grupo/${data.id}`);
  }

  return (
    <>
      <Header />
      <main className="page">
        <h1>{myName ? t("dash.hi", { name: myName }) : t("dash.hiNoName")}</h1>

        {error && <p className="error" role="alert">{error}</p>}

        <section className="block">
          <h2>{t("groups.yourGroups")}</h2>
          {groups === null && <p className="muted">{t("common.loading")}</p>}
          {groups?.length === 0 && (
            <p className="muted">
              {t("groups.none")}
            </p>
          )}
          {groups?.length > 0 && (
            <ul className="list">
              {groups.map((group) => (
                <li key={group.id}>
                  <Link href={`/grupo/${group.id}`} className="row">
                    <span className="title">{group.name}</span>
                    <BalanceText value={group.balance} t={t} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="block">
          <h2>{t("groups.create")}</h2>
          <form className="inline-form" onSubmit={createGroup}>
            <input
              required
              maxLength={60}
              placeholder={t("groups.createPlaceholder")}
              aria-label={t("groups.create")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy}>{t("groups.createBtn")}</button>
          </form>
        </section>

        <section className="block">
          <h2>{t("groups.join")}</h2>
          <form className="inline-form" onSubmit={joinGroup}>
            <input
              required
              placeholder={t("groups.joinPlaceholder")}
              aria-label={t("groups.joinPlaceholder")}
              autoCapitalize="none"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn" disabled={busy}>{t("groups.joinBtn")}</button>
          </form>
        </section>
      </main>
    </>
  );
}
