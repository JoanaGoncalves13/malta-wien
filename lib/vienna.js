let viennaLocale = "en-GB";
export function setViennaLocale(locale) {
  viennaLocale = locale || "en-GB";
}

// Categorias de eventos e sítios, com etiqueta em inglês e emoji
export const EVENT_CATEGORIES = [
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "party", label: "Party", emoji: "🎉" },
  { value: "festival", label: "Festival", emoji: "🎪" },
  { value: "free", label: "Free", emoji: "🆓" },
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "culture", label: "Culture", emoji: "🎭" },
  { value: "sport", label: "Sport", emoji: "⚽" },
  { value: "other", label: "Other", emoji: "📌" },
];

export const PLACE_CATEGORIES = [
  { value: "eat", label: "Cheap eats", emoji: "🍽️" },
  { value: "drink", label: "Drinks", emoji: "🍺" },
  { value: "club", label: "Clubs", emoji: "🕺" },
  { value: "park", label: "Parks", emoji: "🌳" },
  { value: "coffee", label: "Coffee", emoji: "☕" },
  { value: "culture", label: "Culture", emoji: "🎭" },
  { value: "shop", label: "Shops", emoji: "🛍️" },
  { value: "other", label: "Other", emoji: "📌" },
];

export function eventCategory(value) {
  return EVENT_CATEGORIES.find((c) => c.value === value) ?? EVENT_CATEGORIES.at(-1);
}

export function placeCategory(value) {
  return PLACE_CATEGORIES.find((c) => c.value === value) ?? PLACE_CATEGORIES.at(-1);
}

export function priceLevelLabel(level) {
  if (!level) return "";
  return "€".repeat(level);
}

// "2026-10" -> "October 2026"
export function monthKey(isoDate) {
  return isoDate.slice(0, 7);
}

export function monthLabel(key) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  const txt = d.toLocaleDateString(viennaLocale, { month: "long", year: "numeric" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// "15 Oct" ou "15–17 Oct" para eventos de vários dias
export function eventDateLabel(startsOn, endsOn) {
  const start = new Date(`${startsOn}T00:00:00`);
  const opts = { day: "numeric", month: "short" };
  if (!endsOn || endsOn === startsOn) {
    return start.toLocaleDateString(viennaLocale, opts);
  }
  const end = new Date(`${endsOn}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();
  const startTxt = sameMonth
    ? start.toLocaleDateString(viennaLocale, { day: "numeric" })
    : start.toLocaleDateString(viennaLocale, opts);
  return `${startTxt}–${end.toLocaleDateString(viennaLocale, opts)}`;
}
