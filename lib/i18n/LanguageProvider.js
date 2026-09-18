"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, DEFAULT_LANG, isRtl } from "./languages";
import { STRINGS } from "./strings";
import { localeFor } from "./locale";
import { setMoneyLocale } from "../money";
import { setPeriodsLocale } from "../periods";
import { setViennaLocale } from "../vienna";

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "malta-wien-lang";

export function LanguageProvider({ children }) {
  // começa sempre em inglês; se a pessoa já escolheu antes, aplica depois
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // aplicar locale inicial já (síncrono)
  if (typeof window !== "undefined") {
    const loc = localeFor(lang);
    setMoneyLocale(loc);
    setPeriodsLocale(loc);
    setViennaLocale(loc);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGUAGES.some((l) => l.code === saved)) {
        setLangState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
    const loc = localeFor(lang);
    setMoneyLocale(loc);
    setPeriodsLocale(loc);
    setViennaLocale(loc);
  }, [lang]);

  function setLang(code) {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  }

  // t("chave", { name: "Joana" }) -> texto na língua atual, com inglês de reserva
  function t(key, vars) {
    const entry = STRINGS[key];
    let text = entry ? entry[lang] ?? entry[DEFAULT_LANG] ?? key : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replaceAll(`{${k}}`, v);
      }
    }
    return text;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
