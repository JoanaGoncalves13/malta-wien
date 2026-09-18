"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { eur, pairDebts, toCents } from "@/lib/money";
import { periodRange } from "@/lib/periods";
import { eventDateLabel } from "@/lib/vienna";
import ViennaMap from "./ViennaMap";
import Header from "./Header";
import { useLang } from "@/lib/i18n/LanguageProvider";
import ProgressBar from "./ProgressBar";

const sumCents = (list) => list.reduce((t, x) => t + toCents(x.amount), 0);

export default function Dashboard({ session }) {
  const me = session.user.id;
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    // 1. perfil + definições de orçamento
    const [profileRes, settingsRes, groupsRes, eventsRes] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", me).maybeSingle(),
      supabase.from("budget_settings").select("period, total_limit").eq("user_id", me).maybeSingle(),
      supabase.from("groups").select("id, name").order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("id, title, place, starts_on, ends_on, is_free, lat, lng")
        .gte("starts_on", new Date().toLocaleDateString("sv-SE"))
        .order("starts_on", { ascending: true })
        .limit(3),
    ]);

    if (groupsRes.error) return setError(groupsRes.error.message);

    const settings = settingsRes.data ?? { period: "month", total_limit: null };
    const range = periodRange(settings.period, 0);
    const groups = groupsRes.data ?? [];

    // 2. saldo por grupo + dívidas onde entro
    let totalBalance = 0;
    const myDebts = [];
    for (const g of groups) {
      const [balRes, expRes, payRes, memRes] = await Promise.all([
        supabase.rpc("group_balances", { p_group_id: g.id }),
        supabase
          .from("expenses")
          .select("paid_by, expense_splits(user_id, amount, paid_at)")
          .eq("group_id", g.id),
        supabase.from("settlements").select("from_user, to_user, amount").eq("group_id", g.id),
        supabase.from("group_members").select("user_id, profiles(display_name)").eq("group_id", g.id),
      ]);
      const mine = balRes.data?.find((b) => b.user_id === me);
      totalBalance += Number(mine?.balance ?? 0);

      const nameOf = (id) =>
        memRes.data?.find((m) => m.user_id === id)?.profiles?.display_name ?? "Someone";
      for (const d of pairDebts(expRes.data ?? [], payRes.data ?? [])) {
        if (d.from === me) myDebts.push({ ...d, dir: "owe", who: nameOf(d.to), group: g.name });
        else if (d.to === me) myDebts.push({ ...d, dir: "get", who: nameOf(d.from), group: g.name });
      }
    }
    myDebts.sort((a, b) => b.cents - a.cents);

    // 3. gastos do período (pessoais + partes de grupo) e categorias
    const [catRes, persRes, shareRes] = await Promise.all([
      supabase.from("personal_categories").select("id, name").order("position"),
      supabase
        .from("personal_expenses")
        .select("category_id, amount, spent_on")
        .gte("spent_on", range.from)
        .lte("spent_on", range.to),
      supabase
        .from("expense_splits")
        .select("amount, expenses!inner(spent_on)")
        .eq("user_id", me)
        .gte("expenses.spent_on", range.from)
        .lte("expenses.spent_on", range.to),
    ]);

    const personal = persRes.data ?? [];
    const shares = (shareRes.data ?? []).filter((s) => Number(s.amount) > 0);
    const spentCents = sumCents(personal) + sumCents(shares);

    const cats = (catRes.data ?? []).map((c) => ({
      name: c.name,
      cents: sumCents(personal.filter((p) => p.category_id === c.id)),
    }));
    const uncategorized = sumCents(personal.filter((p) => !p.category_id));
    if (uncategorized > 0) cats.push({ name: "Uncategorized", cents: uncategorized });
    if (sumCents(shares) > 0) cats.push({ name: "Group share", cents: sumCents(shares) });
    cats.sort((a, b) => b.cents - a.cents);

    setData({
      name: profileRes.data?.display_name ?? "",
      period: settings.period,
      periodLabel: range.label,
      limitCents: settings.total_limit ? toCents(settings.total_limit) : 0,
      spentCents,
      totalBalance,
      debts: myDebts.slice(0, 4),
      categories: cats.slice(0, 5),
      hasGroups: groups.length > 0,
      events: eventsRes?.data ?? [],
    });
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return (
      <>
        <Header />
        <main className="page">
          <h1 className="hello">{t("nav.home")}</h1>
          {error ? <p className="error">{error}</p> : <p className="muted">{t("common.loading")}</p>}
        </main>
      </>
    );
  }

  const { limitCents, spentCents, totalBalance } = data;
  const remaining = limitCents - spentCents;
  const balPos = totalBalance > 0.004;
  const balNeg = totalBalance < -0.004;
  const periodWord = data.period === "week" ? "this week" : "this month";
  const spentCats = data.categories.filter((c) => c.cents > 0);
  const topCat = Math.max(1, ...spentCats.map((c) => c.cents));

  return (
    <>
      <Header />
      <main className="page">
        <h1 className="hello">{data.name ? t("dash.hi", { name: data.name }) : t("dash.hiNoName")}</h1>
        <p className="subtitle">{t("dash.subtitle")}</p>

        {error && <p className="error block" role="alert">{error}</p>}

        {/* Dois cartões lado a lado */}
        <section className="dash-duo">
          <Link href="/grupos" className={`stat ${balPos ? "stat-green" : "stat-ink"}`}>
            <p className="stat-label">{t("dash.groupBalance")}</p>
            <p className="stat-value">{eur(Math.abs(totalBalance))}</p>
            <p className="stat-sub">
              {balPos ? t("dash.owedOverall") : balNeg ? t("dash.oweOverall") : t("dash.allSettled")}
            </p>
          </Link>

          <Link href="/gastos" className="stat">
            <p className="stat-label">{data.period === "week" ? t("dash.spentThisWeek") : t("dash.spentThisMonth")}</p>
            <p className="stat-value">{eur(spentCents / 100)}</p>
            {limitCents > 0 ? (
              <>
                <ProgressBar value={spentCents} max={limitCents} label="Budget used" />
                <p className="stat-sub muted">
                  {remaining >= 0
                    ? t("dash.leftOf", { left: eur(remaining / 100), total: eur(limitCents / 100) })
                    : t("dash.overBudget", { amount: eur(-remaining / 100) })}
                </p>
              </>
            ) : (
              <p className="stat-sub muted">{t("dash.noBudget")}</p>
            )}
          </Link>
        </section>

        {/* Gráfico por categoria */}
        <section className="block card">
          <div className="card-head">
            <h2>{t("dash.byCategory")}</h2>
            <Link href="/gastos" className="card-link">{t("dash.details")}</Link>
          </div>
          {spentCats.length === 0 ? (
            <p className="chart-empty">{data.period === "week" ? t("dash.noSpendingWeek") : t("dash.noSpendingMonth")}</p>
          ) : (
            <div className="chart">
              {spentCats.map((c) => (
                <div key={c.name} className="chart-row">
                  <span className="chart-name">{c.name}</span>
                  <span className="chart-track">
                    <span className="chart-fill" style={{ width: `${(c.cents / topCat) * 100}%` }} />
                  </span>
                  <span className="chart-val">{eur(c.cents / 100)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quem deve a quem, resumido */}
        <section className="block card">
          <div className="card-head">
            <h2>{t("dash.whoOwes")}</h2>
            <Link href="/grupos" className="card-link">{t("dash.allGroups")}</Link>
          </div>
          {!data.hasGroups ? (
            <p className="chart-empty">{t("dash.noGroups")}</p>
          ) : data.debts.length === 0 ? (
            <p className="chart-empty">{t("dash.nobodyOwes")}</p>
          ) : (
            <div>
              {data.debts.map((d, i) => (
                <div key={i} className="debt-line">
                  <span>
                    {d.dir === "owe" ? (
                      <>{t("dash.youOweStart")} <strong>{d.who}</strong></>
                    ) : (
                      <><strong>{d.who}</strong> {t("dash.owesYouEnd")}</>
                    )}
                    <span className="muted small"> · {d.group}</span>
                  </span>
                  <strong className={d.dir === "owe" ? "neg" : "pos"}>{eur(d.cents / 100)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* O que está a acontecer em Viena */}
        <section className="block card">
          <div className="card-head">
            <h2>{t("dash.whatsOn")}</h2>
            <Link href="/viena" className="card-link">{t("dash.seeAll")}</Link>
          </div>
          {data.events.length === 0 ? (
            <p className="chart-empty">{t("dash.noEvents")}</p>
          ) : (
            <>
              <div className="mini-events">
                {data.events.map((e) => (
                  <Link key={e.id} href="/viena" className="mini-event">
                    <span className="mini-date">{eventDateLabel(e.starts_on, e.ends_on)}</span>
                    <span className="mini-title">{e.title}</span>
                    <span className="mini-meta">
                      {e.is_free ? <span className="pos">Free</span> : null}
                      {e.place ? <span className="muted"> {e.place}</span> : null}
                    </span>
                  </Link>
                ))}
              </div>
              {data.events.some((e) => e.lat != null && e.lng != null) && (
                <div className="mini-map">
                  <ViennaMap
                    height={200}
                    showLocate={false}
                    markers={data.events
                      .filter((e) => e.lat != null && e.lng != null)
                      .map((e) => ({ lat: e.lat, lng: e.lng, title: e.title, subtitle: e.place || "" }))}
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* Atalhos */}
        <section className="block quick">
          <Link href="/gastos" className="quick-btn">
            <strong>{t("dash.addSpending")}</strong>
            <span>{t("dash.logToday")}</span>
          </Link>
          <Link href="/grupos" className="quick-btn">
            <strong>{t("dash.addGroupExpense")}</strong>
            <span>{t("dash.splitBill")}</span>
          </Link>
          <Link href="/viena" className="quick-btn quick-wide">
            <strong>{t("dash.whatsOn")}</strong>
            <span>{t("dash.eventsAndSpots")}</span>
          </Link>
        </section>
      </main>
    </>
  );
}
