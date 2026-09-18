"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/i18n/languages";
import { useLang } from "@/lib/i18n/LanguageProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="lang" ref={ref}>
      <button
        className="lang-btn"
        aria-label="Change language"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-globe" aria-hidden="true">🌐</span>
      </button>
      {open && (
        <ul className="lang-menu" role="menu">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                role="menuitemradio"
                aria-checked={l.code === lang}
                className={`lang-item ${l.code === lang ? "is-current" : ""}`}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
              >
                <span className="lang-flag">{l.flag}</span>
                {l.label}
                {l.code === lang && <span className="lang-check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
