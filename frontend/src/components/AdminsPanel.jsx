import React, { useEffect, useState } from "react";
import { api } from "../api";

function validatePassword(password) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must contain at least one letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  return null;
}

export default function AdminsPanel() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [moduleForm, setModuleForm] = useState({ label: "", value: "" });
  const [moduleSaving, setModuleSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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
      const pwdError = validatePassword(form.password);
      if (pwdError) {
        alert(pwdError);
        return;
      }
      await api.createAdmin(form);
      setForm({ name: "", email: "", password: "" });
      await loadAdmins();
    } catch (e) {
      alert(e.message || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(a) {
    await api.updateAdmin(a.id, { isActive: !a.isActive });
    await loadAdmins();
  }

  function startEdit(admin) {
    setEditingId(admin.id);
    setEditForm({ name: admin.name, email: admin.email, password: "", confirmPassword: "" });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", email: "", password: "", confirmPassword: "" });
    setEditError("");
  }

  function updateEditField(k, v) {
    setEditForm(f => ({ ...f, [k]: v }));
    setEditError("");
  }

  async function saveEdit(adminId) {
    setEditError("");
    
    // Validate password if provided
    if (editForm.password) {
      if (editForm.password !== editForm.confirmPassword) {
        setEditError("Passwords do not match");
        return;
      }
      const pwdError = validatePassword(editForm.password);
      if (pwdError) {
        setEditError(pwdError);
        return;
      }
    }

    setEditSaving(true);
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await api.updateAdmin(adminId, payload);
      cancelEdit();
      await loadAdmins();
    } catch (e) {
      setEditError(e.message || "Failed to update admin");
    } finally {
      setEditSaving(false);
    }
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
            <div key={a.id}>
              {editingId === a.id ? (
                <div style={{ padding:"12px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
                  <div style={{ fontWeight:600, marginBottom:8 }}>Edit Admin</div>
                  {editError && (
                    <div style={{ fontSize:12, color:"#dc2626", marginBottom:8, padding:8, background:"#fef2f2", borderRadius:6 }}>
                      {editError}
                    </div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <input
                      placeholder="Name"
                      value={editForm.name}
                      onChange={e=>updateEditField("name", e.target.value)}
                      style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      value={editForm.email}
                      onChange={e=>updateEditField("email", e.target.value)}
                      style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
                    />
                    <input
                      placeholder="New Password (leave blank to keep current)"
                      type="password"
                      value={editForm.password}
                      onChange={e=>updateEditField("password", e.target.value)}
                      style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
                    />
                    {editForm.password && (
                      <input
                        placeholder="Confirm Password"
                        type="password"
                        value={editForm.confirmPassword}
                        onChange={e=>updateEditField("confirmPassword", e.target.value)}
                        style={{ padding:8, borderRadius:8, border:"1px solid #cbd5e1" }}
                      />
                    )}
                    <div style={{ fontSize:11, color:"#64748b" }}>
                      Password requirements: min 8 characters, 1 letter, 1 number
                    </div>
                    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                      <button
                        onClick={cancelEdit}
                        disabled={editSaving}
                        style={{
                          padding:"6px 12px",
                          borderRadius:8,
                          border:"1px solid #cbd5e1",
                          background:"white",
                          cursor:"pointer",
                          fontSize:12
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(a.id)}
                        disabled={editSaving}
                        style={{
                          padding:"6px 12px",
                          borderRadius:8,
                          border:"none",
                          background:"#0f172a",
                          color:"white",
                          cursor:"pointer",
                          fontSize:12
                        }}
                      >
                        {editSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontWeight:600 }}>{a.name}</div>
                    <div style={{ fontSize:12, color:"#64748b" }}>{a.email}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button
                      onClick={() => startEdit(a)}
                      style={{
                        padding:"4px 8px",
                        borderRadius:8,
                        border:"1px solid #cbd5e1",
                        background:"white",
                        cursor:"pointer",
                        fontSize:12
                      }}
                    >
                      Edit
                    </button>
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
                </div>
              )}
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
