"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

function translate(message = "") {
  if (message.includes("Invalid login credentials")) return "Email ou password errados.";
  if (message.includes("already registered")) return "Já existe uma conta com este email.";
  if (message.includes("at least")) return "A password tem de ter pelo menos 6 caracteres.";
  if (message.includes("Email not confirmed")) return "Confirma o teu email antes de entrar.";
  return message;
}

export default function AuthForm() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
      if (error) setError(translate(error.message));
      else if (!data.session) setInfo("Conta criada. Confirma o email para entrares.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(translate(error.message));
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
      <h1 className="brand">
        Malta
        <br />
        Wien
      </h1>
      <p className="lead">Contas divididas sem dramas.</p>

      <form className="stack" onSubmit={handleSubmit}>
        {isSignup && (
          <label>
            Nome
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
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
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
          {isSignup ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <button className="link" onClick={switchMode}>
        {isSignup ? "Já tens conta? Entra" : "Ainda não tens conta? Cria uma"}
      </button>
    </main>
  );
}
