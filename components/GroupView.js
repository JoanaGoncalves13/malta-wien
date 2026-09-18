"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { eur, formatDay, pairDebts } from "@/lib/money";
import Header from "./Header";
import ExpenseForm from "./ExpenseForm";
import ExpenseItem from "./ExpenseItem";
import { useLang } from "@/lib/i18n/LanguageProvider";

export default function GroupView({ groupId, session }) {
  const me = session.user.id;
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // null = formulário fechado · "new" = nova despesa · objeto = a editar
  const [formFor, setFormFor] = useState(null);

  const load = useCallback(async () => {
    const [groupRes, membersRes, balancesRes, expensesRes, paymentsRes] = await Promise.all([
      supabase.from("groups").select("id, name, invite_code").eq("id", groupId).maybeSingle(),
      supabase.from("group_members").select("user_id, profiles(display_name)").eq("group_id", groupId),
      supabase.rpc("group_balances", { p_group_id: groupId }),
      supabase
        .from("expenses")
        .select(
          "id, description, amount, paid_by, spent_on, created_by, created_at, expense_splits(user_id, amount, paid_at)"
        )
        .eq("group_id", groupId)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("settlements")
        .select("id, from_user, to_user, amount, created_by, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
    ]);

    const failed = [groupRes, membersRes, balancesRes, expensesRes, paymentsRes].find((r) => r.error);
    if (failed) {
      setError(failed.error.message);
      setData({ group: null });
      return;
    }

    setData({
      group: groupRes.data,
      members: (membersRes.data ?? []).map((row) => ({
        id: row.user_id,
        name: row.profiles?.display_name || t("common.someone"),
      })),
      balances: balancesRes.data ?? [],
      expenses: expensesRes.data ?? [],
      payments: paymentsRes.data ?? [],
    });
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (formFor) document.getElementById("expense-form")?.scrollIntoView({ behavior: "smooth" });
  }, [formFor]);

  if (data === null) {
    return (
      <>
        <Header />
        <main className="page">
          <p className="muted">{t("common.loading")}</p>
        </main>
      </>
    );
  }

  if (!data.group) {
    return (
      <>
        <Header />
        <main className="page">
          <Link href="/grupos" className="back">{t("group.back")}</Link>
          <h1>{t("group.notFound")}</h1>
          <p className="muted">{t("group.notFoundBody")}</p>
          {error && <p className="error">{error}</p>}
        </main>
      </>
    );
  }

  const { group, members, balances, expenses, payments } = data;
  const nameOf = (id) => members.find((m) => m.id === id)?.name ?? t("common.someone");
  const myBalance = Number(balances.find((b) => b.user_id === me)?.balance ?? 0);
  const debts = pairDebts(expenses, payments);

  // Histórico de quem já pagou a quem
  const history = [
    ...expenses.flatMap((e) =>
      (e.expense_splits ?? [])
        .filter((s) => s.paid_at && s.user_id !== e.paid_by)
        .map((s) => ({
          key: `s-${e.id}-${s.user_id}`,
          from: s.user_id,
          to: e.paid_by,
          amount: s.amount,
          at: s.paid_at,
          note: e.description,
        }))
    ),
    ...payments.map((p) => ({
      key: `p-${p.id}`,
      from: p.from_user,
      to: p.to_user,
      amount: p.amount,
      at: p.created_at,
      note: t("group.generalPayment"),
      payment: p,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  let balanceClass = "balance";
  let balanceLabel = t("group.settledUp");
  if (myBalance > 0.004) {
    balanceClass += " is-pos";
    balanceLabel = t("group.toReceive");
  } else if (myBalance < -0.004) {
    balanceClass += " is-neg";
    balanceLabel = t("group.toPay");
  }

  function afterChange() {
    setFormFor(null);
    load();
  }

  async function settle(debt) {
    const text = t("group.settleConfirm", { from: nameOf(debt.from), to: nameOf(debt.to), amount: eur(debt.cents / 100) });
    if (!window.confirm(text)) return;
    const { error } = await supabase.rpc("settle_pair", {
      p_group_id: groupId,
      p_user_a: debt.from,
      p_user_b: debt.to,
    });
    if (error) return setError(error.message);
    setError("");
    load();
  }

  async function removePayment(payment) {
    if (!window.confirm(t("group.deletePayment"))) return;
    const { error } = await supabase.from("settlements").delete().eq("id", payment.id);
    if (error) return setError(error.message);
    setError("");
    load();
  }

  function copyCode() {
    navigator.clipboard?.writeText(group.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <Header />
      <main className="page">
        <Link href="/grupos" className="back">{t("group.back")}</Link>
        <h1>{group.name}</h1>

        <div className="invite">
          <span>{t("group.inviteCode")}</span>
          <strong>{group.invite_code}</strong>
          <button className="btn btn-small" onClick={copyCode}>
            {copied ? t("group.copied") : t("group.copy")}
          </button>
        </div>

        <section className={balanceClass} aria-live="polite">
          <p>{balanceLabel}</p>
          <p className="balance-amount">{eur(Math.abs(myBalance))}</p>
        </section>

        {error && <p className="error block" role="alert">{error}</p>}

        <section className="block">
          <h2>{t("group.whoOwes")}</h2>
          {debts.length === 0 ? (
            <p className="muted">{t("group.nobody")}</p>
          ) : (
            <ul className="list">
              {debts.map((debt) => (
                <li key={`${debt.from}-${debt.to}`} className="row">
                  <span>
                    <strong>{nameOf(debt.from)}</strong> {t("group.owesTo")} <strong>{eur(debt.cents / 100)}</strong> {t("group.to")}{" "}
                    <strong>{nameOf(debt.to)}</strong>
                  </span>
                  {(debt.from === me || debt.to === me) && (
                    <button className="btn btn-small" onClick={() => settle(debt)}>
                      {t("group.markAllPaid")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {formFor ? (
          <ExpenseForm
            key={formFor === "new" ? "new" : formFor.id}
            groupId={groupId}
            members={members}
            me={me}
            expense={formFor === "new" ? null : formFor}
            onSaved={afterChange}
            onCancel={() => setFormFor(null)}
          />
        ) : (
          <section className="block">
            <button className="btn btn-primary btn-full" onClick={() => setFormFor("new")}>
              {t("group.addExpense")}
            </button>
          </section>
        )}

        <section className="block">
          <h2>{t("group.expenses")}</h2>
          {expenses.length === 0 ? (
            <p className="muted">{t("group.noExpenses")}</p>
          ) : (
            <>
              <p className="muted small hint">{t("group.tapExpense")}</p>
              <ul className="list">
                {expenses.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    nameOf={nameOf}
                    me={me}
                    onChanged={load}
                    onEdit={setFormFor}
                    onError={setError}
                  />
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="block">
          <h2>{t("group.paymentsHistory")}</h2>
          {history.length === 0 ? (
            <p className="muted">{t("group.noPayments")}</p>
          ) : (
            <ul className="list">
              {history.map((item) => (
                <li key={item.key} className="row">
                  <div>
                    <p>
                      <strong>{nameOf(item.from)}</strong> {t("group.paid")} {eur(item.amount)} {t("group.to")}{" "}
                      <strong>{nameOf(item.to)}</strong>
                    </p>
                    <p className="muted small">
                      {item.note}, {formatDay(item.at.slice(0, 10))}
                    </p>
                  </div>
                  {item.payment?.created_by === me && (
                    <button className="link link-danger" onClick={() => removePayment(item.payment)}>
                      Apagar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="block">
          <h2>{t("group.members")}</h2>
          <p className="muted">
            {members.map((m) => (m.id === me ? `${m.name} (${t("group.you")})` : m.name)).join(", ")}
          </p>
        </section>
      </main>
    </>
  );
}
