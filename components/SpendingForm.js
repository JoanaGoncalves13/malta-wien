"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { toCents, toInput, todayISO } from "@/lib/money";

export default function SpendingForm({ categories, expense, defaultDate, onSaved, onCancel }) {
  const { t } = useLang();
  const isEdit = Boolean(expense);

  const [amount, setAmount] = useState(isEdit ? toInput(expense.amount) : "");
  const [categoryId, setCategoryId] = useState(
    isEdit ? expense.category_id ?? "" : categories[0]?.id ?? ""
  );
  const [description, setDescription] = useState(isEdit ? expense.description ?? "" : "");
  const [date, setDate] = useState(isEdit ? expense.spent_on : defaultDate ?? todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cents = toCents(amount);
    if (cents <= 0) return setError(t("sp.amountPositive"));

    const values = {
      amount: cents / 100,
      category_id: categoryId || null,
      description: description.trim() || null,
      spent_on: date,
    };

    setBusy(true);
    const { error } = isEdit
      ? await supabase.from("personal_expenses").update(values).eq("id", expense.id)
      : await supabase.from("personal_expenses").insert(values);
    setBusy(false);

    if (error) return setError(error.message);

    if (!isEdit) {
      setAmount("");
      setDescription("");
    }
    onSaved();
  }

  return (
    <form className="panel stack" id="spending-form" onSubmit={handleSubmit}>
      {isEdit && <h2>{t("sp.editExpense")}</h2>}

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
          {t("sp.category")}
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="">{t("sp.noCategory")}</option>
          </select>
        </label>
      </div>

      <div className="grid2">
        <label>
          {t("sp.descOptional")}
          <input
            maxLength={100}
            placeholder={t("sp.descPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          {t("common.date")}
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="toggle">
        <button className="btn btn-primary" disabled={busy}>
          {isEdit ? t("common.saveChanges") : t("sp.addExpenseBtn")}
        </button>
        {isEdit && (
          <button type="button" className="btn" onClick={onCancel}>
            {t("common.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
