import React, { useMemo, useState, useEffect } from "react";
import ScoreTabs from "./ScoreTabs";
import { api } from "../api";

// Simple priority bands for UI only.
// Backend already computes priority dynamically; we use it if present.
const PRIORITY_BANDS = {
  high: { label: "High", color: "#059669" },
  medium: { label: "Medium", color: "#d97706" },
  low: { label: "Low", color: "#64748b" },
};

export default function FeatureEditor({ feature, onPatch, onPatchScores, onDelete }) {
  const [draft, setDraft] = useState(feature);
  const [tagInput, setTagInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("details"); // "details" | "scoring"
  const [confirmDelete, setConfirmDelete] = useState(false);

  // local, editable answers map
  const [localAnswers, setLocalAnswers] = useState({});

  // Load configurable scoring questions
  useEffect(() => {
    api.listQuestions().then(setQuestions).catch(console.error);
  }, []);

  // Refresh draft + local answers when selection changes
  useEffect(() => {
    setDraft(feature);
    setTagInput("");
    setActiveTab("details");   // only when id changes
    setConfirmDelete(false);
  }, [feature.id]);

  useEffect(() => {
    const m = {};
    for (const a of feature.answers || []) m[a.questionId] = a.value;
    setLocalAnswers(m);
  }, [feature.answers]);


  // Optimistic slider update + backend sync
  async function patchAnswer(questionId, value) {
    const nextAnswers = { ...localAnswers, [questionId]: value };
    setLocalAnswers(nextAnswers);

    // Build answers payload for API
    const answersPayload = Object.entries(nextAnswers).map(([qid, v]) => ({
      questionId: Number(qid),
      value: Number(v),
    }));

    // ✅ OPTIMISTIC: compute total + priority locally and update sidebar now
    let optimisticTotal = 0;
    for (const q of questions) {
      const v = Number(nextAnswers[q.id] ?? 0);
      optimisticTotal += q.isNegative ? (q.maxScore - v) : v;
    }

    const totalPossible = questions.reduce((s, q) => s + (q.maxScore || 0), 0);
    const highCutoff = totalPossible * 0.75;
    const medCutoff = totalPossible * 0.55;

    const optimisticPriority =
      optimisticTotal >= highCutoff ? "high" :
      optimisticTotal >= medCutoff ? "medium" :
      "low";

    if (onPatchScores) {
      onPatchScores({
        ...feature,
        answers: (feature.answers || []).map(a =>
          a.questionId === questionId ? { ...a, value } : a
        ),
        total: optimisticTotal,
        priority: optimisticPriority,
      });
    }

    // ✅ Then persist to backend
    try {
      const updatedFeature = await api.updateAnswers(feature.id, answersPayload);

      // If backend returns totals, overwrite optimistic values
      if (updatedFeature && onPatchScores) {
        onPatchScores(updatedFeature);
      }
    } catch (e) {
      console.error("Failed to update answers:", e);
    }
  }




  // If backend already returned total/priority, use that.
  // Otherwise compute locally from questions + localAnswers.
  const computedTotal = useMemo(() => {
  // If questions not loaded yet, show server total if available
  if (!questions.length && typeof feature.total === "number") {
    return feature.total;
  }

  let t = 0;
  for (const q of questions) {
    const v = Number(localAnswers[q.id] ?? 0);
    t += q.isNegative ? (q.maxScore - v) : v;
  }
  return t;
}, [questions, localAnswers, feature.total]);

  const priority =
    feature.priority ||
    (() => {
      const totalPossible = questions.reduce(
        (s, q) => s + (q.maxScore || 0),
        0
      );
      const highCutoff = totalPossible * 0.75;
      const medCutoff = totalPossible * 0.55;
      return computedTotal >= highCutoff
        ? "high"
        : computedTotal >= medCutoff
        ? "medium"
        : "low";
    })();

  const band = PRIORITY_BANDS[priority] || PRIORITY_BANDS.low;

  function updateField(key, val) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  async function saveMeta() {
    const payload = {
      title: draft.title,
      summary: draft.summary,
      module: draft.module,
      status: draft.status,
      requestedBy: draft.requestedBy,
      tenant: draft.tenant,
      tags: draft.tags || [],
      decisionNotes: draft.decisionNotes,
    };
    await onPatch(payload);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    const tags = Array.from(new Set([...(draft.tags || []), t]));
    setDraft((d) => ({ ...d, tags }));
    setTagInput("");
  }

  function removeTag(t) {
    const tags = (draft.tags || []).filter((x) => x !== t);
    setDraft((d) => ({ ...d, tags }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header card with score ALWAYS visible */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {feature.code}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {feature.title || "Untitled"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>
              {computedTotal}
            </div>
            <div
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                background: band.color,
                color: "white",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {band.label}
            </div>
            
            
          </div>
          
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={() => setActiveTab("details")}
            style={{
              padding: "8px 10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === "details" ? 700 : 500,
              borderBottom:
                activeTab === "details"
                  ? "2px solid #0f172a"
                  : "2px solid transparent",
            }}
          >
            Details
          </button>

          <button
            onClick={() => setActiveTab("scoring")}
            style={{
              padding: "8px 10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === "scoring" ? 700 : 500,
              borderBottom:
                activeTab === "scoring"
                  ? "2px solid #0f172a"
                  : "2px solid transparent",
            }}
          >
            Scoring
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "details" && (
          <div style={{ marginTop: 12 }}>
            <div className="form-grid-3">
              <div>
                <label style={{ fontSize: 12 }}>Title</label>
                <input
                  value={draft.title || ""}
                  onChange={(e) =>
                    updateField("title", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12 }}>Module</label>
                <select
                  value={draft.module || ""}
                  onChange={(e) =>
                    updateField("module", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <option value="">Unassigned</option>
                  <option value="core">Core ERP</option>
                  <option value="production">Production</option>
                  <option value="inventory">Inventory</option>
                  <option value="accounting">Accounting</option>
                  <option value="mobile">Mobile</option>
                  <option value="ai">AI / Automation</option>
                  <option value="reporting">Reporting</option>
                  <option value="integrations">Integrations</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12 }}>Status</label>
                <select
                  value={draft.status || "intake"}
                  onChange={(e) =>
                    updateField("status", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <option value="intake">Intake</option>
                  <option value="triage">Triage</option>
                  <option value="scoring">Scoring</option>
                  <option value="ready">Ready</option>
                  <option value="deferred">Deferred</option>
                  <option value="shipped">Shipped</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12 }}>Requested By</label>
                <input
                  value={draft.requestedBy || ""}
                  onChange={(e) =>
                    updateField("requestedBy", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12 }}>Tenant</label>
                <input
                  value={draft.tenant || ""}
                  onChange={(e) =>
                    updateField("tenant", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12 }}>Tags</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={tagInput}
                    onChange={(e) =>
                      setTagInput(e.target.value)
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), addTag())
                    }
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <button
                    onClick={addTag}
                    style={{
                      padding: "0 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  {(draft.tags || []).map((t) => (
                    <div
                      key={t}
                      onClick={() => removeTag(t)}
                      style={{
                        fontSize: 12,
                        background: "#f1f5f9",
                        padding: "2px 6px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {t} ×
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 8, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12 }}>
                  Summary / Use Case
                </label>
                <textarea
                  value={draft.summary || ""}
                  onChange={(e) =>
                    updateField("summary", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    minHeight: 80,
                  }}
                />
              </div>

              <div style={{ marginTop: 8 , gridColumn: "1 / -1" }} >
                <label style={{ fontSize: 12 }}>
                  Decision Notes
                </label>
                <textarea
                  value={draft.decisionNotes || ""}
                  onChange={(e) =>
                    updateField("decisionNotes", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    minHeight: 60,
                  }}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",       // spans the full width of the grid
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                {/* Left: Delete */}
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #fee2e2",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Delete
                </button>

                {/* Right: Save */}
                <button
                  onClick={saveMeta}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: "#0f172a",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Save Details
                </button>
              </div>


            </div>
            
          </div>
        )}

        {activeTab === "scoring" && (
          <div style={{ marginTop: 12 }}>
            <ScoreTabs
              questions={questions}
              answersMap={localAnswers}
              onChange={patchAnswer}
            />
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: 20,
              borderRadius: 12,
              width: 320,
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 10 }}>
              Delete Feature
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#334155",
                marginBottom: 20,
              }}
            >
              Are you sure you want to delete{" "}
              <strong>{feature.title || feature.code}</strong>?
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #fee2e2",
                  background: "#dc2626",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
