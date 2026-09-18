"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { toCents, toInput } from "@/lib/money";

function friendly(error, t) {
  if (error?.code === "23505") return t("bud.errDupe");
  return error?.message ?? t("bud.errSave");
}

export default function BudgetSettings({ me, settings, categories, onSaved, onClose }) {
  const { t } = useLang();
  const [period, setPeriod] = useState(settings.period);
  const [total, setTotal] = useState(settings.total_limit ? toInput(settings.total_limit) : "");
  const [rows, setRows] = useState(
    categories.map((c) => ({
      key: c.id,
      id: c.id,
      name: c.name,
      limit: c.limit_amount ? toInput(c.limit_amount) : "",
    }))
  );
  const [removed, setRemoved] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const periodWord = period === "week" ? t("bud.week").toLowerCase() : t("bud.month").toLowerCase();

  function updateRow(key, field, value) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((current) => [...current, { key: `new-${Date.now()}`, id: null, name: "", limit: "" }]);
  }

  function removeRow(row) {
    if (row.id) setRemoved((current) => [...current, row.id]);
    setRows((current) => current.filter((r) => r.key !== row.key));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const clean = rows.map((r, index) => ({
      ...r,
      name: r.name.trim(),
      limitCents: toCents(r.limit),
      position: index,
    }));
    if (clean.some((r) => !r.name)) return setError(t("bud.errName"));

    setBusy(true);

    const totalCents = toCents(total);
    const settingsRes = await supabase.from("budget_settings").upsert(
      {
        user_id: me,
        period,
        total_limit: totalCents > 0 ? totalCents / 100 : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (settingsRes.error) {
      setBusy(false);
      return setError(friendly(settingsRes.error, t));
    }

    if (removed.length > 0) {
      const { error } = await supabase.from("personal_categories").delete().in("id", removed);
      if (error) {
        setBusy(false);
        return setError(friendly(error, t));
      }
    }

    for (const r of clean) {
      const values = {
        name: r.name,
        limit_amount: r.limitCents > 0 ? r.limitCents / 100 : null,
        position: r.position,
      };
      const { error } = r.id
        ? await supabase.from("personal_categories").update(values).eq("id", r.id)
        : await supabase.from("personal_categories").insert(values);
      if (error) {
        setBusy(false);
        return setError(friendly(error, t));
      }
    }

    setBusy(false);
    onSaved();
  }

  return (
    <section className="block" id="budget-settings">
      <h2>{t("bud.title")}</h2>
      <form className="panel stack" onSubmit={handleSubmit}>
        <div className="stack">
          <p className="title">{t("bud.controlBy")}</p>
          <div className="toggle">
            <button
              type="button"
              className="btn btn-small"
              aria-pressed={period === "month"}
              onClick={() => setPeriod("month")}
            >
              {t("bud.month")}
            </button>
            <button
              type="button"
              className="btn btn-small"
              aria-pressed={period === "week"}
              onClick={() => setPeriod("week")}
            >
              {t("bud.week")}
            </button>
          </div>
        </div>

        <label>
          {period === "week" ? t("bud.maxPerWeek") : t("bud.maxPerMonth")}
          <input
            type="text"
            inputMode="decimal"
            placeholder={t("bud.noLimit")}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </label>

        <div className="stack">
          <p className="title">{t("bud.categoryLimits")}</p>
          <p className="muted small">{t("bud.leaveBlank")}</p>
          {rows.map((row) => (
            <div key={row.key} className="limit-row">
              <input
                aria-label="Nome da categoria"
                maxLength={30}
                placeholder={t("bud.name")}
                value={row.name}
                onChange={(e) => updateRow(row.key, "name", e.target.value)}
              />
              <input
                aria-label={`Limite de ${row.name || "categoria"}`}
                type="text"
                inputMode="decimal"
                placeholder={t("bud.noLimit")}
                value={row.limit}
                onChange={(e) => updateRow(row.key, "limit", e.target.value)}
              />
              <button type="button" className="link link-danger" onClick={() => removeRow(row)}>
                {t("bud.remove")}
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-small add-cat" onClick={addRow}>
            {t("bud.addCategory")}
          </button>
          {removed.length > 0 && (
            <p className="muted small">
              {t("bud.removedNote")}
            </p>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="toggle">
          <button className="btn btn-primary" disabled={busy}>{t("bud.saveBudget")}</button>
          <button type="button" className="btn" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </form>
    </section>
  );
}
