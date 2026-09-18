"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";

const LINKS = [
  { href: "/", key: "nav.home", icon: "home" },
  { href: "/grupos", key: "nav.groups", icon: "groups" },
  { href: "/gastos", key: "nav.spending", icon: "wallet" },
  { href: "/viena", key: "nav.vienna", icon: "pin" },
];

function Icon({ name }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "home")
    return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
  if (name === "groups")
    return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 6a3 3 0 0 1 0 6" /><path d="M18 14c2.5.5 4 2.3 4 5" /></svg>;
  if (name === "wallet")
    return <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" /></svg>;
  if (name === "pin")
    return <svg {...common}><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
  return null;
}

export default function Header() {
  const pathname = usePathname();
  const { t } = useLang();

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  return (
    <>
      <header className="topbar">
        <Link href="/" className="logo">
          play smart
        </Link>
        <nav className="nav nav-desktop">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              aria-current={isActive(l.href) ? "page" : undefined}
            >
              {t(l.key)}
            </Link>
          ))}
          <button className="link" onClick={() => supabase.auth.signOut()}>
            {t("nav.signout")}
          </button>
        </nav>
        <div className="top-actions">
          <LanguageSwitcher />
          <button className="link signout-mobile" onClick={() => supabase.auth.signOut()}>
            {t("nav.signout")}
          </button>
        </div>
      </header>

      <nav className="tabbar" aria-label="Main">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="tabbar-item"
            aria-current={isActive(l.href) ? "page" : undefined}
          >
            <Icon name={l.icon} />
            <span>{t(l.key)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
