// Locale atual para datas e moeda; o LanguageProvider atualiza isto.
let currentLocale = "en-GB";
export function setMoneyLocale(locale) {
  currentLocale = locale || "en-GB";
}

export function eur(value, locale = currentLocale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(Number(value) || 0);
}

// "12,50" ou "12.50" -> 1250
export function toCents(value) {
  const n = parseFloat(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

// Divide cêntimos em partes iguais; os cêntimos que sobram vão para os primeiros
export function splitEqually(totalCents, ids) {
  const out = {};
  if (!ids.length || totalCents <= 0) return out;
  const base = Math.floor(totalCents / ids.length);
  let rest = totalCents - base * ids.length;
  for (const id of ids) {
    out[id] = base + (rest > 0 ? 1 : 0);
    if (rest > 0) rest--;
  }
  return out;
}

// Transforma saldos no menor número de pagamentos possível
export function simplifyDebts(balances) {
  const people = balances.map((b) => ({
    id: b.user_id,
    cents: Math.round(Number(b.balance) * 100),
  }));
  const creditors = people
    .filter((p) => p.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  const debtors = people
    .filter((p) => p.cents < 0)
    .map((p) => ({ id: p.id, cents: -p.cents }))
    .sort((a, b) => b.cents - a.cents);

  const result = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) result.push({ from: debtors[i].id, to: creditors[j].id, cents: pay });
    debtors[i].cents -= pay;
    creditors[j].cents -= pay;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }
  return result;
}

export function formatDay(isoDate, locale = currentLocale) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

export function todayISO() {
  return new Date().toLocaleDateString("sv-SE");
}

// Dívidas diretas entre pares, a partir das partes ainda não pagas
export function pairDebts(expenses, payments = []) {
  const owed = new Map();
  const add = (from, to, cents) => {
    const key = `${from}|${to}`;
    owed.set(key, (owed.get(key) ?? 0) + cents);
  };

  for (const expense of expenses) {
    for (const split of expense.expense_splits ?? []) {
      if (split.user_id === expense.paid_by || split.paid_at) continue;
      add(split.user_id, expense.paid_by, Math.round(Number(split.amount) * 100));
    }
  }
  for (const p of payments) {
    add(p.from_user, p.to_user, -Math.round(Number(p.amount) * 100));
  }

  const seen = new Set();
  const result = [];
  for (const key of owed.keys()) {
    const [a, b] = key.split("|");
    const pairKey = [a, b].sort().join("|");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);
    const net = (owed.get(`${a}|${b}`) ?? 0) - (owed.get(`${b}|${a}`) ?? 0);
    if (net > 0) result.push({ from: a, to: b, cents: net });
    else if (net < 0) result.push({ from: b, to: a, cents: -net });
  }
  return result.sort((x, y) => y.cents - x.cents);
}

// 12.5 -> "12,50" para pôr num campo de texto
export function toInput(value) {
  return Number(value).toFixed(2).replace(".", ",");
}
