"use client";

import { eur, formatDay } from "@/lib/money";
import { isoDate } from "@/lib/periods";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { localeFor } from "@/lib/i18n/locale";



export default function CalendarGrid({ from, to, totals, selected, onSelect }) {
  const { lang } = useLang();
  const loc = localeFor(lang);
  const short = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  // dias da semana começando na segunda, no idioma atual
  const wdFmt = new Intl.DateTimeFormat(loc, { weekday: "short" });
  const WEEKDAYS = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 1 + i); // 1 Jan 2024 = segunda
    WEEKDAYS.push(wdFmt.format(d));
  }
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(isoDate(d));
  }

  const leading = (start.getDay() + 6) % 7;
  const max = Math.max(0, ...days.map((day) => totals[day] ?? 0));
  const today = isoDate(new Date());

  function level(cents) {
    if (!cents || !max) return 0;
    const ratio = cents / max;
    if (ratio <= 0.33) return 1;
    if (ratio <= 0.66) return 2;
    return 3;
  }

  return (
    <div className="calendar">
      {WEEKDAYS.map((w) => (
        <span key={w} className="cal-head" aria-hidden="true">
          {w}
        </span>
      ))}
      {Array.from({ length: leading }, (_, i) => (
        <span key={`empty-${i}`} />
      ))}
      {days.map((day) => {
        const cents = totals[day] ?? 0;
        const classes = ["cal-day", `lvl-${level(cents)}`];
        if (day === today) classes.push("is-today");
        return (
          <button
            key={day}
            type="button"
            className={classes.join(" ")}
            aria-pressed={selected === day}
            aria-label={`${formatDay(day)}${cents ? `, gastaste ${eur(cents / 100)}` : ", sem gastos"}`}
            onClick={() => onSelect(selected === day ? null : day)}
          >
            <span className="cal-num">{Number(day.slice(8))}</span>
            <span className="cal-amount">{cents ? `${short.format(cents / 100)}€` : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
