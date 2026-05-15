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

const DEFAULT_MODULES = [
  { label: "Core ERP", value: "core" },
  { label: "Production", value: "production" },
  { label: "Inventory", value: "inventory" },
  { label: "Accounting", value: "accounting" },
  { label: "Mobile", value: "mobile" },
  { label: "AI / Automation", value: "ai" },
  { label: "Reporting", value: "reporting" },
  { label: "Integrations", value: "integrations" },
];

/** Keep in sync with backend LONG_TEXT_FIELD_MAX_CHARS (featureTextValidation.js). */
const LONG_TEXT_FIELD_MAX_CHARS = 65535;
const PROS_CONS_MIN_CHARS = 20;

/** @returns {Record<string, string>} field key → message */
function buildDetailsFieldErrors(draft) {
  const errors = {};
  const summary = draft.summary ?? "";
  const pros = draft.pros ?? "";
  const cons = draft.cons ?? "";
  const notes = draft.decisionNotes ?? "";

  if (summary.length > LONG_TEXT_FIELD_MAX_CHARS) {
    errors.summary = `Summary cannot exceed ${LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters.`;
  }
  if (pros.length > LONG_TEXT_FIELD_MAX_CHARS) {
    errors.pros = `Pros cannot exceed ${LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters.`;
  } else if (pros.trim().length < PROS_CONS_MIN_CHARS) {
    errors.pros = `Pros must be at least ${PROS_CONS_MIN_CHARS} characters (not counting leading or trailing spaces).`;
  }
  if (cons.length > LONG_TEXT_FIELD_MAX_CHARS) {
    errors.cons = `Cons cannot exceed ${LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters.`;
  } else if (cons.trim().length < PROS_CONS_MIN_CHARS) {
    errors.cons = `Cons must be at least ${PROS_CONS_MIN_CHARS} characters (not counting leading or trailing spaces).`;
  }
  if (notes.length > LONG_TEXT_FIELD_MAX_CHARS) {
    errors.decisionNotes = `Decision notes cannot exceed ${LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters.`;
  }
  return errors;
}

/** @returns {"image"|"pdf"|"video"|"audio"|"text"|"none"} */
function attachmentPreviewKind(mime, filename) {
  const m = (mime || "").toLowerCase();
  const ext = (filename || "").split(".").pop()?.toLowerCase() || "";
  if (m.startsWith("image/") || /^(gif|png|jpe?g|webp|svg|bmp|ico|avif)$/i.test(ext)) {
    return "image";
  }
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("video/") || /^(mp4|webm|ogv|mov)$/i.test(ext)) return "video";
  if (m.startsWith("audio/") || /^(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(ext)) {
    return "audio";
  }
  if (
    m.startsWith("text/") ||
    m === "application/json" ||
    m === "application/xml" ||
    /^(txt|csv|md|json|xml|log|yaml|yml|tsx?|jsx?|css|html?)$/i.test(ext)
  ) {
    return "text";
  }
  return "none";
}

export default function FeatureEditor({
  admin,
  feature,
  onPatch,
  onPatchScores,
  onFeatureSync,
  onDelete,
}) {
  const [draft, setDraft] = useState(feature);
  const [tagInput, setTagInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState("details"); // "details" | "scoring"
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [attachmentPreviewFailed, setAttachmentPreviewFailed] = useState(false);

  // local, editable answers map for the current admin
  const [localAnswers, setLocalAnswers] = useState({});

  const formatScore = (value) => {
    const num = Number(value ?? 0);
    return Number.isInteger(num) ? num : num.toFixed(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  // Load configurable scoring questions + module options
  useEffect(() => {
    api.listQuestions().then(setQuestions).catch(console.error);
    api.listModules()
      .then(setModules)
      .catch((err) => {
        console.error("Failed to load modules", err);
      });
  }, []);

  // Refresh draft + local answers when selection changes
  useEffect(() => {
    setDraft(feature);
    setTagInput("");
    setActiveTab("details");   // only when id changes
    setConfirmDelete(false);
    setAttachmentPreview(null);
    setAttachmentPreviewFailed(false);
  }, [feature.id]);

  useEffect(() => {
    if (!attachmentPreview) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setAttachmentPreview(null);
        setAttachmentPreviewFailed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attachmentPreview]);

  // Check if scoring tab should be visible (both pros and cons have at least 20 chars)
  const canShowScoringTab = useMemo(() => {
    const pros = (draft.pros || "").trim();
    const cons = (draft.cons || "").trim();
    return pros.length >= PROS_CONS_MIN_CHARS && cons.length >= PROS_CONS_MIN_CHARS;
  }, [draft.pros, draft.cons]);

  const detailsFieldErrors = useMemo(
    () => buildDetailsFieldErrors(draft),
    [draft.summary, draft.pros, draft.cons, draft.decisionNotes]
  );
  const detailsFormValid = Object.keys(detailsFieldErrors).length === 0;

  useEffect(() => {
    const answers = feature.answers || [];
    const mine = admin?.id
      ? answers.filter((a) => a.adminId === admin.id)
      : answers.filter((a) => !a.adminId);
    const fallback = mine.length ? mine : answers.filter((a) => !a.adminId);
    const map = {};
    for (const entry of (mine.length ? mine : fallback)) {
      map[entry.questionId] = entry.value;
    }
    setLocalAnswers(map);
  }, [feature.answers, admin?.id]);


  // Admin-specific slider update + backend sync
  async function patchAnswer(questionId, value) {
    const nextAnswers = { ...localAnswers, [questionId]: value };
    setLocalAnswers(nextAnswers);

    try {
      const updatedFeature = await api.updateAnswers(feature.id, [
        { questionId, value: Number(value) },
      ]);

      if (updatedFeature && onPatchScores) {
        onPatchScores(updatedFeature);
      }
    } catch (e) {
      console.error("Failed to update answers:", e);
    }
  }




  // If backend already returned total/priority, use that.
  // Otherwise compute locally from questions + localAnswers.
  const reviewerTotals = feature.scoreTotals || [];

  const savedScoreEntry = useMemo(() => {
    if (!reviewerTotals.length) return null;
    if (admin?.id) {
      return reviewerTotals.find((entry) => entry.adminId === admin.id) || null;
    }
    return reviewerTotals.find((entry) => !entry.adminId) || reviewerTotals[0];
  }, [reviewerTotals, admin?.id]);

  const yourScore = useMemo(() => {
    if (!questions.length) {
      return savedScoreEntry?.total ?? 0;
    }

    let total = 0;
    let touched = false;
    for (const q of questions) {
      if (localAnswers[q.id] == null) continue;
      const v = Number(localAnswers[q.id]);
      total += q.isNegative ? (q.maxScore - v) : v;
      touched = true;
    }

    if (!touched) return savedScoreEntry?.total ?? 0;
    return Number(total.toFixed(2));
  }, [questions, localAnswers, savedScoreEntry]);

  const medianScore = Number(feature.total ?? 0);
  const priority = feature.priority || "low";
  const band = PRIORITY_BANDS[priority] || PRIORITY_BANDS.low;

  const availableModules = useMemo(() => {
    if (modules.length) {
      return modules
        .filter((m) => m.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return DEFAULT_MODULES;
  }, [modules]);

  function updateField(key, val) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  async function syncFeatureFromServer() {
    if (!onFeatureSync) return;
    try {
      const full = await api.getFeature(feature.id);
      onFeatureSync(full);
    } catch (e) {
      console.error("syncFeatureFromServer failed:", e);
    }
  }

  async function handleAttachmentSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachmentError("");
    setAttachmentBusy(true);
    try {
      await api.uploadFeatureAttachment(feature.id, file);
      await syncFeatureFromServer();
    } catch (err) {
      setAttachmentError(err.message || "Upload failed");
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function handleDeleteAttachment(attId) {
    setAttachmentError("");
    setAttachmentBusy(true);
    try {
      await api.deleteFeatureAttachment(feature.id, attId);
      await syncFeatureFromServer();
    } catch (err) {
      setAttachmentError(err.message || "Delete failed");
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function saveDetails() {
    const payload = {
      title: draft.title,
      summary: draft.summary,
      pros: draft.pros,
      cons: draft.cons,
      module: draft.module,
      status: draft.status,
      requestedBy: draft.requestedBy,
      tenant: draft.tenant,
      tags: draft.tags || [],
      decisionNotes: draft.decisionNotes,
    };
    await onPatch(payload);
  }

  async function saveMeta(goToScoring = false) {
    if (!detailsFormValid) return;

    await saveDetails();

    if (goToScoring && canShowScoringTab) {
      setActiveTab("scoring");
    }
  }

  async function handleSaveDetailsClick() {
    if (!detailsFormValid) return;
    await saveDetails();
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

          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Median score
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {formatScore(medianScore)}
              </div>
            </div>
            <div
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                background: band.color,
                color: "white",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "capitalize",
              }}
            >
              {band.label}
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Your score
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {formatScore(yourScore)}
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginTop: 12,
            padding: "12px 0",
            borderBottom: "1px solid #e2e8f0",
            fontSize: 12,
            color: "#64748b",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Created by
            </div>
            <div style={{ fontWeight: 600, color: "#334155" }}>
              {feature.createdBy?.name || "Unknown"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {formatDate(feature.createdAt)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Last updated by
            </div>
            <div style={{ fontWeight: 600, color: "#334155" }}>
              {feature.updatedBy?.name || "Unknown"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {formatDate(feature.updatedAt)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Last reviewed
            </div>
            <div style={{ fontWeight: 600, color: "#334155" }}>
              {feature.lastReviewedAt ? formatDate(feature.lastReviewedAt) : "Never"}
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

          {canShowScoringTab && (
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
          )}
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
                  onChange={(e) => updateField("module", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <option value="">Unassigned</option>
                  {availableModules.map((mod) => (
                    <option key={mod.value} value={mod.value}>
                      {mod.label}
                    </option>
                  ))}
                  {draft.module &&
                    !availableModules.some((m) => m.value === draft.module) && (
                      <option value={draft.module}>{draft.module}</option>
                    )}
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
                    border: detailsFieldErrors.summary
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                    minHeight: 120,
                  }}
                />
                {detailsFieldErrors.summary && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                    {detailsFieldErrors.summary}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color:
                      (draft.summary || "").length > LONG_TEXT_FIELD_MAX_CHARS
                        ? "#dc2626"
                        : "#64748b",
                  }}
                >
                  {(draft.summary || "").length.toLocaleString()} /{" "}
                  {LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters maximum
                </div>
              </div>

              <div style={{ marginTop: 16, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12 }}>Attachments</label>
                <div
                  style={{
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fafafa",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <input
                      type="file"
                      disabled={attachmentBusy}
                      onChange={handleAttachmentSelected}
                      style={{ fontSize: 12 }}
                    />
                    {attachmentBusy && (
                      <span style={{ fontSize: 12, color: "#64748b" }}>Working…</span>
                    )}
                  </div>
                  {attachmentError && (
                    <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>
                      {attachmentError}
                    </div>
                  )}
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13 }}>
                    {(feature.attachments || []).map((att) => (
                      <li key={att.id} style={{ marginBottom: 6 }}>
                        <button
                          type="button"
                          disabled={!att.downloadUrl}
                          onClick={() => {
                            if (!att.downloadUrl) return;
                            setAttachmentPreviewFailed(false);
                            setAttachmentPreview(att);
                          }}
                          style={{
                            padding: 0,
                            border: "none",
                            background: "none",
                            font: "inherit",
                            color: att.downloadUrl ? "#2563eb" : "#94a3b8",
                            cursor: att.downloadUrl ? "pointer" : "not-allowed",
                            textDecoration: att.downloadUrl ? "underline" : "none",
                            textAlign: "left",
                          }}
                        >
                          {att.originalFilename}
                        </button>
                        {att.sizeBytes != null && (
                          <span style={{ color: "#64748b", marginLeft: 6 }}>
                            ({Math.round(att.sizeBytes / 1024)} KB)
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={attachmentBusy}
                          onClick={() => handleDeleteAttachment(att.id)}
                          style={{
                            marginLeft: 10,
                            fontSize: 11,
                            border: "none",
                            background: "transparent",
                            color: "#b91c1c",
                            cursor: attachmentBusy ? "not-allowed" : "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!(feature.attachments || []).length && (
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                      No files yet. Presigned links expire; refresh the page if a download stops working.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 8, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12 }}>
                  Make the case for doing this (Pros) *
                </label>
                <textarea
                  value={draft.pros || ""}
                  onChange={(e) => updateField("pros", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: detailsFieldErrors.pros
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                    minHeight: 100,
                  }}
                  placeholder={`At least ${PROS_CONS_MIN_CHARS} non-empty characters; ${LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} max`}
                />
                {detailsFieldErrors.pros && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                    {detailsFieldErrors.pros}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color: (() => {
                      const len = (draft.pros || "").length;
                      const trim = (draft.pros || "").trim().length;
                      if (len > LONG_TEXT_FIELD_MAX_CHARS || trim < PROS_CONS_MIN_CHARS) {
                        return "#dc2626";
                      }
                      return "#64748b";
                    })(),
                  }}
                >
                  {(draft.pros || "").length.toLocaleString()} /{" "}
                  {LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters maximum
                  {" · "}
                  at least {PROS_CONS_MIN_CHARS} (excluding leading/trailing spaces)
                </div>
              </div>

              <div style={{ marginTop: 8, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12 }}>
                  Make the case for not doing this (Cons) *
                </label>
                <textarea
                  value={draft.cons || ""}
                  onChange={(e) => updateField("cons", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: detailsFieldErrors.cons
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                    minHeight: 100,
                  }}
                  placeholder={`At least ${PROS_CONS_MIN_CHARS} non-empty characters; ${LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} max`}
                />
                {detailsFieldErrors.cons && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                    {detailsFieldErrors.cons}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color: (() => {
                      const len = (draft.cons || "").length;
                      const trim = (draft.cons || "").trim().length;
                      if (len > LONG_TEXT_FIELD_MAX_CHARS || trim < PROS_CONS_MIN_CHARS) {
                        return "#dc2626";
                      }
                      return "#64748b";
                    })(),
                  }}
                >
                  {(draft.cons || "").length.toLocaleString()} /{" "}
                  {LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters maximum
                  {" · "}
                  at least {PROS_CONS_MIN_CHARS} (excluding leading/trailing spaces)
                </div>
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
                    border: detailsFieldErrors.decisionNotes
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                    minHeight: 80,
                  }}
                />
                {detailsFieldErrors.decisionNotes && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                    {detailsFieldErrors.decisionNotes}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color:
                      (draft.decisionNotes || "").length > LONG_TEXT_FIELD_MAX_CHARS
                        ? "#dc2626"
                        : "#64748b",
                  }}
                >
                  {(draft.decisionNotes || "").length.toLocaleString()} /{" "}
                  {LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters maximum
                </div>
              </div>

              {!detailsFormValid && (
                <div
                  role="alert"
                  style={{
                    gridColumn: "1 / -1",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    Fix the following before you can save or go to the Scoring tab:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {Object.entries(detailsFieldErrors).map(([key, msg]) => (
                      <li key={key} style={{ marginBottom: 4 }}>
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div
                style={{
                  gridColumn: "1 / -1",       // spans the full width of the grid
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
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

                {/* Right: Next or Save */}
                {canShowScoringTab ? (
                  <button
                    type="button"
                    disabled={!detailsFormValid}
                    title={
                      !detailsFormValid
                        ? Object.values(detailsFieldErrors)[0] || "Complete required fields"
                        : undefined
                    }
                    onClick={() => saveMeta(true)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: detailsFormValid ? "#0f172a" : "#94a3b8",
                      color: "white",
                      cursor: detailsFormValid ? "pointer" : "not-allowed",
                      fontSize: 12,
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!detailsFormValid}
                    title={
                      !detailsFormValid
                        ? Object.values(detailsFieldErrors)[0] || "Complete required fields"
                        : undefined
                    }
                    onClick={handleSaveDetailsClick}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: detailsFormValid ? "#0f172a" : "#94a3b8",
                      color: "white",
                      cursor: detailsFormValid ? "pointer" : "not-allowed",
                      fontSize: 12,
                    }}
                  >
                    Save
                  </button>
                )}
              </div>


            </div>
            
          </div>
        )}

        {activeTab === "scoring" && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                marginBottom: 12,
                background: "#f8fafc",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Reviewer breakdown
              </div>

              {reviewerTotals.length ? (
                reviewerTotals.map((entry) => (
                  <div
                    key={`${entry.adminId ?? "legacy"}-${
                      entry.adminEmail || entry.adminName || "anon"
                    }`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      fontWeight: entry.adminId === admin?.id ? 700 : 500,
                      color:
                        entry.adminId === admin?.id ? "#0f172a" : "#334155",
                    }}
                  >
                    <span>{entry.adminName || entry.adminEmail || "Unattributed"}</span>
                    <span>{formatScore(entry.total)}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  No admin has saved a score yet.
                </div>
              )}

              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                Median priority uses the midpoint of everyone listed above.
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 12,
              }}
            >
              Your sliders only update <strong>your</strong> answers; the feature rank is the
              median of every admin's total.
            </div>

            <ScoreTabs
              questions={questions}
              answersMap={localAnswers}
              onChange={patchAnswer}
            />
          </div>
        )}
      </div>

      {/* Attachment preview modal */}
      {attachmentPreview && attachmentPreview.downloadUrl && (
        <div
          onClick={() => {
            setAttachmentPreview(null);
            setAttachmentPreviewFailed(false);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 12,
              width: "min(960px, 100%)",
              maxHeight: "min(92vh, 900px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                borderBottom: "1px solid #e2e8f0",
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={attachmentPreview.originalFilename}
                >
                  {attachmentPreview.originalFilename}
                </div>
                {attachmentPreview.mimeType && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {attachmentPreview.mimeType}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a
                  href={attachmentPreview.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentPreview(null);
                    setAttachmentPreviewFailed(false);
                  }}
                  style={{
                    fontSize: 13,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div
              style={{
                padding: 16,
                overflow: "auto",
                flex: 1,
                minHeight: 200,
                background: "#f8fafc",
              }}
            >
              {(() => {
                const url = attachmentPreview.downloadUrl;
                const name = attachmentPreview.originalFilename;
                const kind = attachmentPreviewKind(
                  attachmentPreview.mimeType,
                  name
                );

                if (kind === "image" && !attachmentPreviewFailed) {
                  return (
                    <div style={{ textAlign: "center" }}>
                      <img
                        src={url}
                        alt={name}
                        onError={() => setAttachmentPreviewFailed(true)}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "min(72vh, 720px)",
                          borderRadius: 8,
                          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                        }}
                      />
                    </div>
                  );
                }

                if (kind === "pdf") {
                  return (
                    <iframe
                      title={name}
                      src={url}
                      style={{
                        width: "100%",
                        height: "min(72vh, 720px)",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        background: "white",
                      }}
                    />
                  );
                }

                if (kind === "video") {
                  return (
                    <video
                      src={url}
                      controls
                      style={{
                        width: "100%",
                        maxHeight: "min(72vh, 720px)",
                        borderRadius: 8,
                        background: "#000",
                      }}
                    />
                  );
                }

                if (kind === "audio") {
                  return (
                    <div
                      style={{
                        padding: 24,
                        background: "white",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <audio src={url} controls style={{ width: "100%" }} />
                    </div>
                  );
                }

                if (kind === "text") {
                  return (
                    <iframe
                      title={name}
                      src={url}
                      style={{
                        width: "100%",
                        height: "min(72vh, 720px)",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        background: "white",
                      }}
                    />
                  );
                }

                return (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "#475569",
                      fontSize: 14,
                      background: "white",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {attachmentPreviewFailed && kind === "image" ? (
                      <p style={{ margin: "0 0 12px" }}>
                        Could not load image preview.
                      </p>
                    ) : (
                      <p style={{ margin: "0 0 12px" }}>
                        No in-app preview for this file type. Use{" "}
                        <strong>Open in new tab</strong> to view or download.
                      </p>
                    )}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb" }}
                    >
                      Open file
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
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
