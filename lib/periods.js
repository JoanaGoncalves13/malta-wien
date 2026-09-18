let periodsLocale = "en-GB";
export function setPeriodsLocale(locale) {
  periodsLocale = locale || "en-GB";
}

const pad = (n) => String(n).padStart(2, "0");

export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Intervalo do mês ou da semana (segunda a domingo), com deslocamento
export function periodRange(period, offset = 0, locale = periodsLocale) {
  const now = new Date();

  if (period === "week") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const f = (d) => d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    return {
      from: isoDate(start),
      to: isoDate(end),
      label: `${f(start)} – ${f(end)}`,
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const name = start.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return {
    from: isoDate(start),
    to: isoDate(end),
    label: name.charAt(0).toUpperCase() + name.slice(1),
  };
}

// Dias que faltam até ao fim do período, contando com hoje
export function daysLeft(toIso) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(`${toIso}T00:00:00`);
  return Math.max(1, Math.round((end - today) / 86400000) + 1);
}
