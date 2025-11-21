import React, { useEffect, useState } from "react";
import { api } from "./api";
import Login from "./components/Login";
import FeatureBoard from "./components/FeatureBoard";

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      const r = await api.me();
      setAdmin(r.admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshMe(); }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!admin) return <Login onAuthed={refreshMe} />;

  return <FeatureBoard admin={admin} onLogout={async () => {
    await api.logout();
    setAdmin(null);
  }} />;
}
