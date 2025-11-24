import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function AdminsPanel() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [moduleForm, setModuleForm] = useState({ label: "", value: "" });
  const [moduleSaving, setModuleSaving] = useState(false);

  async function loadAdmins() {
    const list = await api.listAdmins();
    setAdmins(list);
  }

  async function loadModules() {
    const list = await api.listModules();
    setModules(list);
  }

  useEffect(() => {
    Promise.all([loadAdmins(), loadModules()]).catch(console.error);
  }, []);

  function updateField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function create(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createAdmin(form);
      setForm({ name: "", email: "", password: "" });
      await loadAdmins();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(a) {
    await api.updateAdmin(a.id, { isActive: !a.isActive });
    await loadAdmins();
  }

  function updateModuleField(k, v) {
    setModuleForm((f) => ({ ...f, [k]: v }));
  }

  async function createModule(e) {
    e.preventDefault();
    if (!moduleForm.label.trim()) return;
    setModuleSaving(true);
    try {
      await api.createModule({
        label: moduleForm.label,
        value: moduleForm.value || undefined,
      });
      setModuleForm({ label: "", value: "" });
      await loadModules();
    } finally {
      setModuleSaving(false);
    }
  }

  async function toggleModuleActive(mod) {
    await api.updateModule(mod.id, { isActive: !mod.isActive });
    await loadModules();
  }

  async function removeModule(mod) {
    if (!window.confirm(`Remove module "${mod.label}"?`)) return;
    await api.deleteModule(mod.id);
    await loadModules();
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div className="card">
        <div style={{ fontWeight:700, marginBottom:8 }}>Add Admin</div>
        <form onSubmit={create} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:8 }}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={e=>updateField("name", e.target.value)}
            style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={e=>updateField("email", e.target.value)}
            style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={e=>updateField("password", e.target.value)}
            style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
          />
          <button
            disabled={loading}
            style={{
              padding:"8px 12px",
              borderRadius:8,
              border:"none",
              background:"#0f172a",
              color:"white",
              cursor:"pointer",
              fontSize:12
            }}
          >
            {loading ? "Saving..." : "Create"}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ fontWeight:700, marginBottom:8 }}>Admins</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {admins.map(a => (
            <div key={a.id}
                 style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontWeight:600 }}>{a.name}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>{a.email}</div>
              </div>
              <button
                onClick={() => toggleActive(a)}
                style={{
                  padding:"4px 8px",
                  borderRadius:8,
                  border:"1px solid #cbd5e1",
                  background:"white",
                  cursor:"pointer",
                  fontSize:12
                }}
              >
                {a.isActive ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
          {!admins.length && (
            <div style={{ fontSize:12, color:"#64748b" }}>No admins yet.</div>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight:700, marginBottom:8 }}>Module Library</div>
        <form
          onSubmit={createModule}
          style={{ display:"grid", gridTemplateColumns:"2fr 1fr auto", gap:8, marginBottom:12 }}
        >
          <input
            placeholder="Label (e.g., Supply Chain)"
            value={moduleForm.label}
            onChange={e=>updateModuleField("label", e.target.value)}
            style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
          />
          <input
            placeholder="Value (optional)"
            value={moduleForm.value}
            onChange={e=>updateModuleField("value", e.target.value)}
            style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
          />
          <button
            disabled={moduleSaving}
            style={{
              padding:"8px 12px",
              borderRadius:8,
              border:"none",
              background:"#0f172a",
              color:"white",
              cursor:"pointer",
              fontSize:12,
              fontWeight:600
            }}
          >
            {moduleSaving ? "Saving..." : "Add Module"}
          </button>
        </form>

        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {modules.map(mod => (
            <div
              key={mod.id}
              style={{
                display:"grid",
                gridTemplateColumns:"2fr 1fr auto auto",
                gap:8,
                alignItems:"center",
                padding:"6px 0",
                borderBottom:"1px solid #f1f5f9"
              }}
            >
              <div>
                <div style={{ fontWeight:600 }}>{mod.label}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>{mod.value}</div>
              </div>
              <div style={{ fontSize:12, color:"#64748b" }}>Sort: {mod.sortOrder}</div>
              <button
                onClick={() => toggleModuleActive(mod)}
                style={{
                  padding:"4px 8px",
                  borderRadius:8,
                  border:"1px solid #cbd5e1",
                  background:"white",
                  cursor:"pointer",
                  fontSize:12
                }}
              >
                {mod.isActive ? "Disable" : "Enable"}
              </button>
              <button
                onClick={() => removeModule(mod)}
                style={{
                  padding:"4px 8px",
                  borderRadius:8,
                  border:"1px solid #fee2e2",
                  background:"#fef2f2",
                  color:"#b91c1c",
                  cursor:"pointer",
                  fontSize:12
                }}
              >
                Delete
              </button>
            </div>
          ))}
          {!modules.length && (
            <div style={{ fontSize:12, color:"#64748b" }}>
              No modules yet. Add one above to populate the Feature module dropdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
