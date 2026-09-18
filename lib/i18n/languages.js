// As 11 línguas do grupo. rtl = escrita da direita para a esquerda.
export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "sl", label: "Slovenščina", flag: "🇸🇮" },
  { code: "ar", label: "العربية", flag: "🇵🇸", rtl: true },
];

export const DEFAULT_LANG = "en";

export function isRtl(code) {
  return LANGUAGES.find((l) => l.code === code)?.rtl ?? false;
}
