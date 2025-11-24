import React from "react";
import { Plus, Search, LogOut } from "lucide-react";

export default function FeatureList({
  className = "",
  admin,
  mainTab,                // "features" | "admins"
  onChangeMainTab,        // setter from FeatureBoard
  search,
  onSearch,
  sortField,
  onSortField,
  sortOrder,
  onSortOrder,
  features,
  activeId,
  onSelect,
  onCreate,
  onLogout,
}) {
  const formatScore = (value) => {
    const num = Number(value ?? 0);
    return Number.isInteger(num) ? num : num.toFixed(1);
  };

  return (
    <div
      className={`sidebar ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "white",
        borderRight: "1px solid #e2e8f0",
      }}
    >
      {/* TOP (fixed) */}
      <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 600 }}>
          {mainTab === "admins" ? "Admins" : "Feature Requests"}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Signed in as {admin?.name}
        </div>
 

        {/* Search + Sort only on features tab */}
        {mainTab === "features" && (
          <>
          <div style={{ marginTop: 12, position: "relative" }}>
            <button
                onClick={onCreate}
                style={{
                  width:"100%",
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  border: "none",
                  background: "#0f172a",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Plus size={16} /> New Feature
              </button>
            </div>
            <div style={{ marginTop: 12, position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />

              <input
                placeholder="Search…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px 0 34px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: "#64748b" }}>Sort By</label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {/* Sort Field */}
                <select
                  value={sortField}
                  onChange={(e) => onSortField(e.target.value)}
                  style={{
                    padding: "7px 8px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    background: "white",
                    width: "100%",
                  }}
                >
                  <option value="priority">Priority</option>
                  <option value="total">Score</option>
                  <option value="updatedAt">Updated</option>
                  <option value="createdAt">Created</option>
                  <option value="title">Title</option>
                  <option value="status">Status</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortOrder}
                  onChange={(e) => onSortOrder(e.target.value)}
                  style={{
                    padding: "7px 8px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    background: "white",
                    width: "100%",
                  }}
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MIDDLE (scrolls) */}
      <div style={{ overflow: "auto", flex: 1 }}>
        {mainTab === "features" ? (
          <>
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelect(f.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 12,
                  borderBottom: "1px solid #f1f5f9",
                  background: f.id === activeId ? "#f8fafc" : "white",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}
                  >
                    {f.title || f.code}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: 6,
                        background:
                          f.priority === "high"
                            ? "#059669"
                            : f.priority === "medium"
                            ? "#d97706"
                            : "#64748b",
                        minWidth: 30,
                        textAlign: "center",
                      }}
                      title={`Median score: ${formatScore(f.total)}`}
                    >
                      {formatScore(f.total)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#94a3b8",
                        textAlign: "right",
                      }}
                    >
                      {(f.scoreTotals?.length || 0) > 0
                        ? `${f.scoreTotals.length} ${f.scoreTotals.length === 1 ? "reviewer" : "reviewers"}`
                        : "No scores"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#334155",
                    marginTop: 4,
                    fontWeight: 500,
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {f.status || "intake"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {f.summary || "No summary yet"}
                </div>
              </button>
            ))}

            {!features.length && (
              <div style={{ padding: 16, fontSize: 12, color: "#64748b" }}>
                No requests yet.
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 16, fontSize: 12, color: "#64748b" }}>
            Admin management is shown in the main panel.
          </div>
        )}
      </div>

      {/* BOTTOM (fixed) */}
      <div
        style={{
          padding: 12,
          borderTop: "1px solid #e2e8f0",
          background: "white",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {/* Left button changes based on tab */}
          {mainTab === "features" ? (
            <button
            onClick={() => onChangeMainTab("admins")}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: mainTab === "admins" ? "#0f172a" : "white",
              color: mainTab === "admins" ? "white" : "#0f172a",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Admins
          </button>
          ) : (
            <button
              onClick={() => onChangeMainTab("features")}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "none",
                background: "#0f172a",
                color: "white",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Back to Features
            </button>
          )}

          {/* Logout always visible */}
          <button
            onClick={onLogout}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
