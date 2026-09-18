"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { eur, formatDay } from "@/lib/money";
import { useLang } from "@/lib/i18n/LanguageProvider";

export default function ExpenseItem({ expense, nameOf, me, onChanged, onEdit, onError }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const splits = expense.expense_splits ?? [];
  const payerSplit = splits.find((s) => s.user_id === expense.paid_by);
  const debtors = splits.filter((s) => s.user_id !== expense.paid_by && Number(s.amount) > 0);
  const paidCount = debtors.filter((s) => s.paid_at).length;
  const allPaid = debtors.length > 0 && paidCount === debtors.length;

  let status;
  if (debtors.length === 0) status = t("xi.onlyPayer");
  else if (allPaid) status = t("xi.allPaid");
  else status = t("xi.paidOf", { paid: paidCount, total: debtors.length });

  const canDelete = me === expense.created_by || me === expense.paid_by;

  async function togglePaid(split) {
    setBusyId(split.user_id);
    const { error } = await supabase.rpc("set_split_paid", {
      p_expense_id: expense.id,
      p_user_id: split.user_id,
      p_paid: !split.paid_at,
    });
    setBusyId(null);
    if (error) return onError(error.message);
    onError("");
    onChanged();
  }

  async function remove() {
    if (!window.confirm(t("xi.deleteConfirm", { name: expense.description }))) return;
    const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
    if (error) return onError(error.message);
    onError("");
    onChanged();
  }

  return (
    <li className="expense">
      <button
        className="row row-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <div>
          <p className="title">{expense.description}</p>
          <p className="muted small">
            {formatDay(expense.spent_on)}, pago por {nameOf(expense.paid_by)}
          </p>
        </div>
        <div className="right">
          <strong>{eur(expense.amount)}</strong>
          <span className={`small ${allPaid || debtors.length === 0 ? "pos" : "muted"}`}>
            {status}
          </span>
        </div>
      </button>

      {open && (
        <div className="detail">
          <ul className="people">
            {payerSplit && (
              <li className="split-row">
                <span>
                  {nameOf(payerSplit.user_id)}
                  <span className="muted small"> {t("xi.paidBill")}</span>
                </span>
                <span className="muted">{eur(payerSplit.amount)}</span>
              </li>
            )}
            {debtors.map((split) => {
              const canMark = [split.user_id, expense.paid_by, expense.created_by].includes(me);
              return (
                <li key={split.user_id} className="split-row">
                  <span>
                    {nameOf(split.user_id)}{" "}
                    <span className={`tag ${split.paid_at ? "tag-paid" : "tag-due"}`}>
                      {split.paid_at ? t("xi.hasPaid") : t("xi.toPay")}
                    </span>
                  </span>
                  <span className="split-actions">
                    <span>{eur(split.amount)}</span>
                    {canMark && (
                      <button
                        className="btn btn-small"
                        disabled={busyId === split.user_id}
                        onClick={() => togglePaid(split)}
                      >
                        {split.paid_at ? t("xi.unmark") : t("xi.markPaid")}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="toggle">
            <button className="btn btn-small" onClick={() => onEdit(expense)}>
              {t("common.edit")}
            </button>
            {canDelete && (
              <button className="link link-danger" onClick={remove}>
                {t("common.delete")}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
