"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { eur, formatDay, toCents } from "@/lib/money";
import { daysLeft, periodRange } from "@/lib/periods";
import Header from "./Header";
import { useLang } from "@/lib/i18n/LanguageProvider";
import ProgressBar from "./ProgressBar";
import CalendarGrid from "./CalendarGrid";
import SpendingForm from "./SpendingForm";
import BudgetSettings from "./BudgetSettings";

const DEFAULT_CATEGORIES = ["Supermercado", "Festas", "Viagens", "Restaurantes", "Transportes", "Outros"];

const sumCents = (list) => list.reduce((total, item) => total + toCents(item.amount), 0);

export default function Spending({ session }) {
  const me = session.user.id;
  const { t } = useLang();
  const seeding = useRef(false);

  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState("");

  const period = settings?.period ?? "month";
  const range = periodRange(period, offset);

  const loadSetup = useCallback(async () => {
    const [settingsRes, categoriesRes] = await Promise.all([
      supabase.from("budget_settings").select("period, total_limit").eq("user_id", me).maybeSingle(),
      supabase
        .from("personal_categories")
        .select("id, name, limit_amount, position")
        .order("position")
        .order("created_at"),
    ]);

    const failed = settingsRes.error || categoriesRes.error;
    if (failed) return setError(failed.message);

    let list = categoriesRes.data ?? [];
    if (list.length === 0) {
      if (seeding.current) return;
      seeding.current = true;
      const { data, error } = await supabase
        .from("personal_categories")
        .insert(DEFAULT_CATEGORIES.map((name, position) => ({ name, position })))
        .select("id, name, limit_amount, position");
      if (error) return setError(error.message);
      list = data ?? [];
    }

    setCategories(list);
    setSettings(settingsRes.data ?? { period: "month", total_limit: null });
  }, [me]);

  const loadItems = useCallback(async () => {
    const [personalRes, sharesRes] = await Promise.all([
      supabase
        .from("personal_expenses")
        .select("id, category_id, description, amount, spent_on, created_at")
        .gte("spent_on", range.from)
        .lte("spent_on", range.to)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("expense_splits")
        .select("amount, expenses!inner(id, description, spent_on, created_at, groups(name))")
        .eq("user_id", me)
        .gte("expenses.spent_on", range.from)
        .lte("expenses.spent_on", range.to),
    ]);

    const failed = personalRes.error || sharesRes.error;
    if (failed) return setError(failed.message);

    setItems({
      personal: personalRes.data ?? [],
      shares: (sharesRes.data ?? []).filter((s) => Number(s.amount) > 0),
    });
  }, [me, range.from, range.to]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    if (settings) loadItems();
  }, [settings, loadItems]);

  useEffect(() => {
    if (editing) document.getElementById("spending-form")?.scrollIntoView({ behavior: "smooth" });
  }, [editing]);

  useEffect(() => {
    if (showSettings) document.getElementById("budget-settings")?.scrollIntoView({ behavior: "smooth" });
  }, [showSettings]);

  if (!settings) {
    return (
      <>
        <Header />
        <main className="page">
          <h1>{t("sp.title")}</h1>
          {error ? <p className="error">{error}</p> : <p className="muted">A carregar…</p>}
        </main>
      </>
    );
  }

  const personal = items?.personal ?? [];
  const shares = items?.shares ?? [];
  const personalCents = sumCents(personal);
  const sharesCents = sumCents(shares);
  const spentCents = personalCents + sharesCents;
  const limitCents = settings.total_limit ? toCents(settings.total_limit) : 0;
  const remainingCents = limitCents - spentCents;
  const periodEnd = period === "week" ? "da semana" : "do mês";
  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? t("sp.uncategorized");

  const byCategory = categories.map((c) => ({
    key: c.id,
    name: c.name,
    spent: sumCents(personal.filter((p) => p.category_id === c.id)),
    limit: c.limit_amount ? toCents(c.limit_amount) : 0,
  }));
  const uncategorized = sumCents(personal.filter((p) => !p.category_id));
  if (uncategorized > 0) byCategory.push({ key: "none", name: t("sp.uncategorized"), spent: uncategorized, limit: 0 });
  if (sharesCents > 0) byCategory.push({ key: "groups", name: t("sp.groupShare"), spent: sharesCents, limit: 0 });

  const list = [
    ...personal.map((p) => ({ ...p, kind: "personal" })),
    ...shares.map((s) => ({
      kind: "share",
      id: `share-${s.expenses.id}`,
      amount: s.amount,
      spent_on: s.expenses.spent_on,
      created_at: s.expenses.created_at,
      description: s.expenses.description,
      group: s.expenses.groups?.name ?? "grupo",
    })),
  ].sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at));

  const totals = {};
  for (const item of list) {
    totals[item.spent_on] = (totals[item.spent_on] ?? 0) + toCents(item.amount);
  }
  const visibleList = selectedDay ? list.filter((item) => item.spent_on === selectedDay) : list;
  const periodWord = period === "week" ? t("sp.thisWeekWord") : t("sp.thisMonthWord");

  async function remove(item) {
    if (!window.confirm("Apagar este gasto?")) return;
    const { error } = await supabase.from("personal_expenses").delete().eq("id", item.id);
    if (error) return setError(error.message);
    setError("");
    loadItems();
  }

  function goTo(newOffset) {
    setOffset(newOffset);
    setSelectedDay(null);
  }

  function afterSettings() {
    setShowSettings(false);
    goTo(0);
    loadSetup();
  }

  let cardClass = "balance";
  if (limitCents > 0 && remainingCents < 0) cardClass += " is-neg";

  return (
    <>
      <Header />
      <main className="page">
        <h1>{t("sp.title")}</h1>

        <div className="period-nav">
          <button className="btn btn-small" aria-label="Período anterior" onClick={() => goTo(offset - 1)}>
            ‹
          </button>
          <strong>{range.label}</strong>
          <button
            className="btn btn-small"
            aria-label="Período seguinte"
            onClick={() => goTo(offset + 1)}
          >
            ›
          </button>
        </div>
        {offset !== 0 && (
          <button className="link small today-link" onClick={() => goTo(0)}>
            {period === "week" ? "Voltar a esta semana" : "Voltar a este mês"}
          </button>
        )}

        <section className={cardClass} aria-live="polite">
          {limitCents > 0 ? (
            <>
              <p>{remainingCents >= 0 ? t("sp.canStillSpend") : t("sp.overBy")}</p>
              <p className="balance-amount">{eur(Math.abs(remainingCents) / 100)}</p>
              <ProgressBar value={spentCents} max={limitCents} label="Gasto do orçamento total" />
              <p className="balance-sub">
                {t("sp.spentOf", { spent: eur(spentCents / 100), total: eur(limitCents / 100) })}
                {offset === 0 && remainingCents > 0 &&
                  `. Dá cerca de ${eur(remainingCents / 100 / daysLeft(range.to))} por dia até ao fim ${periodEnd}.`}
              </p>
            </>
          ) : (
            <>
              <p>{t("sp.spent")}</p>
              <p className="balance-amount">{eur(spentCents / 100)}</p>
              <p className="balance-sub">
                {" "}
                <button className="link" onClick={() => setShowSettings(true)}>
                  {t("sp.setBudget")}
                </button>
              </p>
            </>
          )}
        </section>

        {error && <p className="error block" role="alert">{error}</p>}

        <section className="block">
          <h2>Calendário</h2>
          <p className="muted small hint">Toca num dia para ver ou registar gastos nesse dia.</p>
          <CalendarGrid
            from={range.from}
            to={range.to}
            totals={totals}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />
        </section>

        <section className="block">
          {editing ? (
            <SpendingForm
              key={editing.id}
              categories={categories}
              expense={editing}
              onSaved={() => {
                setEditing(null);
                loadItems();
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <>
              <h2>{selectedDay ? `${t("sp.newExpense")} · ${formatDay(selectedDay)}` : t("sp.newExpense")}</h2>
              <SpendingForm
                key={`new-${selectedDay ?? "today"}`}
                categories={categories}
                defaultDate={selectedDay}
                onSaved={loadItems}
              />
            </>
          )}
        </section>

        <section className="block">
          <div className="section-head">
            <h2>{t("sp.byCategory")}</h2>
            {!showSettings && (
              <button className="link" onClick={() => setShowSettings(true)}>
                {t("sp.setLimits")}
              </button>
            )}
          </div>
          <ul className="list">
            {byCategory.map((c) => {
              const left = c.limit - c.spent;
              return (
                <li key={c.key} className="cat">
                  <div className="cat-head">
                    <span className="title">{c.name}</span>
                    <span>
                      {eur(c.spent / 100)}
                      {c.limit > 0 && <span className="muted"> de {eur(c.limit / 100)}</span>}
                    </span>
                  </div>
                  {c.limit > 0 && (
                    <>
                      <ProgressBar value={c.spent} max={c.limit} label={`Gasto em ${c.name}`} />
                      <p className={`small ${left < 0 ? "neg" : "muted"}`}>
                        {left < 0 ? `Passaste ${eur(-left / 100)}` : `Faltam ${eur(left / 100)}`}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {showSettings && (
          <BudgetSettings
            me={me}
            settings={settings}
            categories={categories}
            onSaved={afterSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        <section className="block">
          <div className="section-head">
            <h2>{selectedDay ? `${t("sp.spending")} · ${formatDay(selectedDay)}` : t("sp.spending")}</h2>
            {selectedDay && (
              <button className="link" onClick={() => setSelectedDay(null)}>
                {t("sp.viewAll", { period: periodWord })}
              </button>
            )}
          </div>
          {items === null ? (
            <p className="muted">A carregar…</p>
          ) : visibleList.length === 0 ? (
            <p className="muted">
              {selectedDay ? t("sp.noDaySpending") : t("sp.noneThisPeriod")}
            </p>
          ) : (
            <ul className="list">
              {visibleList.map((item) => (
                <li key={item.id} className="row">
                  <div>
                    <p className="title">
                      {item.kind === "share"
                        ? item.description
                        : item.description || categoryName(item.category_id)}
                    </p>
                    <p className="muted small">
                      {formatDay(item.spent_on)},{" "}
                      {item.kind === "share"
                        ? `a tua parte em ${item.group}`
                        : categoryName(item.category_id)}
                    </p>
                  </div>
                  <div className="right">
                    <strong>{eur(item.amount)}</strong>
                    {item.kind === "personal" && (
                      <span className="link-row">
                        <button className="link small" onClick={() => setEditing(item)}>
                          Editar
                        </button>
                        <button className="link link-danger" onClick={() => remove(item)}>
                          Apagar
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
