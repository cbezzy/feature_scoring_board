import React, { useState } from "react";
import { api } from "../api";

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.login(email, password);
      onAuthed();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc" }}>
      <form onSubmit={submit} style={{ width: 380, background: "white", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <h2 style={{ margin: 0 }}>{import.meta.env.VITE_APP_NAME}</h2> 

        <label style={{ fontSize: 12 }}>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} style={{ width: "100%", padding: 8, margin: "4px 0 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />

        <label style={{ fontSize: 12 }}>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{ width: "100%", padding: 8, margin: "4px 0 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />

        {err && <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 8 }}>{err}</div>}

        <button type="submit" style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#0f172a", color: "white", cursor: "pointer" }}>
          Sign in
        </button>
      </form>
    </div>
  );
}
