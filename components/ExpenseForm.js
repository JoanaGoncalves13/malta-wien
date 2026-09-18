"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { eur, splitEqually, toCents, toInput, todayISO } from "@/lib/money";
import { useLang } from "@/lib/i18n/LanguageProvider";

function initialState(expense, allIds, me) {
  if (!expense) {
    return {
      description: "",
      amount: "",
      paidBy: me,
      date: todayISO(),
      mode: "equal",
      included: allIds,
      custom: {},
    };
  }

  const splits = expense.expense_splits ?? [];
  const ids = allIds.filter((id) => splits.some((s) => s.user_id === id));
  const equal = splitEqually(toCents(expense.amount), ids);
  const isEqual = splits.every((s) => equal[s.user_id] === toCents(s.amount));

  return {
    description: expense.description,
    amount: toInput(expense.amount),
    paidBy: expense.paid_by,
    date: expense.spent_on,
    mode: isEqual ? "equal" : "custom",
    included: isEqual ? ids : allIds,
    custom: Object.fromEntries(splits.map((s) => [s.user_id, toInput(s.amount)])),
  };
}

export default function ExpenseForm({ groupId, members, me, expense, onSaved, onCancel }) {
  const { t } = useLang();
  const allIds = members.map((m) => m.id);
  const [init] = useState(() => initialState(expense, allIds, me));
  const isEdit = Boolean(expense);

  const [description, setDescription] = useState(init.description);
  const [amount, setAmount] = useState(init.amount);
  const [paidBy, setPaidBy] = useState(init.paidBy);
  const [date, setDate] = useState(init.date);
  const [mode, setMode] = useState(init.mode);
  const [included, setIncluded] = useState(init.included);
  const [custom, setCustom] = useState(init.custom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totalCents = toCents(amount);
  const equalShares = splitEqually(totalCents, allIds.filter((id) => included.includes(id)));
  const customSum = allIds.reduce((sum, id) => sum + toCents(custom[id]), 0);
  const customDiff = totalCents - customSum;

  function toggleIncluded(id) {
    setIncluded((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (totalCents <= 0) return setError(t("xf.amountPositive"));

    let splits;
    if (mode === "equal") {
      if (included.length === 0) return setError(t("xf.chooseOne"));
      splits = Object.entries(equalShares).map(([id, cents]) => ({ id, cents }));
    } else {
      if (customDiff > 0) return setError(t("xf.missing", { amount: eur(customDiff / 100) }));
      if (customDiff < 0) return setError(t("xf.over", { amount: eur(-customDiff / 100) }));
      splits = allIds
        .map((id) => ({ id, cents: toCents(custom[id]) }))
        .filter((s) => s.cents > 0);
    }

    const common = {
      p_description: description,
      p_amount: totalCents / 100,
      p_paid_by: paidBy,
      p_spent_on: date,
      p_splits: splits.map((s) => ({ user_id: s.id, amount: s.cents / 100 })),
    };

    setBusy(true);
    const { error } = isEdit
      ? await supabase.rpc("update_expense", { p_expense_id: expense.id, ...common })
      : await supabase.rpc("add_expense", { p_group_id: groupId, ...common });
    setBusy(false);

    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <section className="block" id="expense-form">
      <h2>{isEdit ? t("xf.editExpense") : t("xf.newExpense")}</h2>
      <form className="panel stack" onSubmit={handleSubmit}>
        <label>
          {t("xf.what")}
          <input
            required
            maxLength={100}
            placeholder={t("xf.whatPh")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="grid2">
          <label>
            {t("common.amountEuro")}
            <input
              required
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            {t("common.date")}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <label>
          {t("xf.whoPaid")}
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === me ? `${m.name} (tu)` : m.name}
              </option>
            ))}
          </select>
        </label>

        <div className="stack">
          <div className="toggle">
            <button
              type="button"
              className="btn btn-small"
              aria-pressed={mode === "equal"}
              onClick={() => setMode("equal")}
            >
              {t("xf.equalSplit")}
            </button>
            <button
              type="button"
              className="btn btn-small"
              aria-pressed={mode === "custom"}
              onClick={() => setMode("custom")}
            >
              {t("xf.customSplit")}
            </button>
          </div>

          <div>
            {members.map((m) =>
              mode === "equal" ? (
                <div key={m.id} className="split-row">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={included.includes(m.id)}
                      onChange={() => toggleIncluded(m.id)}
                    />
                    {m.name}
                  </label>
                  <span className="muted">
                    {included.includes(m.id) ? eur((equalShares[m.id] ?? 0) / 100) : t("xf.out")}
                  </span>
                </div>
              ) : (
                <div key={m.id} className="split-row">
                  <span>{m.name}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    aria-label={`Parte de ${m.name}`}
                    value={custom[m.id] ?? ""}
                    onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })}
                  />
                </div>
              )
            )}
          </div>

          {mode === "custom" && totalCents > 0 && (
            <p className={customDiff === 0 ? "pos small" : "muted small"}>
              {customDiff === 0
                ? t("xf.allSplit")
                : customDiff > 0
                ? t("xf.missing", { amount: eur(customDiff / 100) })
                : t("xf.over", { amount: eur(-customDiff / 100) })}
            </p>
          )}
        </div>

        {isEdit && (
          <p className="muted small">
            Se mudares o valor de alguém, essa parte volta a ficar por pagar. Se mudares quem
            pagou a conta, todas as partes voltam a ficar por pagar.
          </p>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <div className="toggle">
          <button className="btn btn-primary" disabled={busy}>
            {isEdit ? t("common.saveChanges") : t("common.saveExpense")}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}
