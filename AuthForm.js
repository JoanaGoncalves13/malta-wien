"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";

function translate(message, t) {
  if (message?.includes("Invalid login credentials")) return t("auth.errWrong");
  if (message?.includes("already registered")) return t("auth.errExists");
  if (message?.includes("at least")) return t("auth.errShort");
  if (message?.includes("Email not confirmed")) return t("auth.errUnconfirmed");
  return message;
}

const WELCOMES = [
  "Welcome", "Bem-vindo", "Bienvenido", "Bienvenue", "Willkommen",
  "Welkom", "Benvenuto", "Bun venit", "Tervetuloa", "Dobrodošli", "أهلاً",
];

export default function AuthForm() {
  const { t } = useLang();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [greetIdx, setGreetIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setGreetIdx((i) => (i + 1) % WELCOMES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (error) setError(translate(error.message, t));
      else if (!data.session) setInfo(t("auth.created"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(translate(error.message, t));
    }

    setBusy(false);
  }

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError("");
    setInfo("");
  }

  return (
    <main className="auth">
      <div className="auth-top">
        <LanguageSwitcher />
      </div>

      <p className="welcome" key={greetIdx}>{WELCOMES[greetIdx]}</p>
      <h1 className="brand">
        play
        <br />
        smart
      </h1>
      <p className="lead">{t("auth.tagline")}</p>

      <form className="stack" onSubmit={handleSubmit}>
        {isSignup && (
          <label>
            {t("auth.name")}
            <input
              required
              maxLength={40}
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label>
          {t("auth.email")}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          {t("auth.password")}
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="info">{info}</p>}

        <button className="btn btn-primary btn-full" disabled={busy}>
          {isSignup ? t("auth.createAccount") : t("auth.signIn")}
        </button>
      </form>

      <button className="link" onClick={switchMode}>
        {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}
      </button>
    </main>
  );
}
