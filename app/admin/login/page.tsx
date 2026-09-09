"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="tt-card"
        style={{ width: 320, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <h1 style={{ fontSize: 18, margin: 0, letterSpacing: "0.02em" }}>TABLE TALKS — Admin</h1>
        <label className="tt-label">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="tt-input"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <label className="tt-label">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="tt-input"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        {error && <p style={{ color: "var(--c-crit)", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} className="tt-btn" style={{ marginTop: 4 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
