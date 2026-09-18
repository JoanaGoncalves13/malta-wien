// Converte o código de idioma da app no locale para formatar datas e números
const MAP = {
  en: "en-GB",
  pt: "pt-PT",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
  it: "it-IT",
  ro: "ro-RO",
  fi: "fi-FI",
  sl: "sl-SI",
  ar: "ar",
};

export function localeFor(lang) {
  return MAP[lang] ?? "en-GB";
}
