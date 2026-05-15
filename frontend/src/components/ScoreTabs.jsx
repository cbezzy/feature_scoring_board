import React, { useMemo } from "react";

function scoreButtons(maxScore) {
  const opts = [];
  for (let i = 0; i <= maxScore; i++) {
    opts.push(i);
  }
  return opts;
}

export default function ScoreTabs({ questions, answersMap, onChange }) {
  const groups = useMemo(() => {
    const g = {};
    for (const q of questions) {
      if (!g[q.group]) g[q.group] = [];
      g[q.group].push(q);
    }
    return Object.entries(g);
  }, [questions]);

  return (
    <div className="card">
      {groups.map(([groupName, qs]) => (
        <div key={groupName} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{groupName}</div>
          {qs.map((q) => {
            const answered = Object.hasOwn(answersMap, q.id);
            const storedValue = answersMap[q.id];

            return (
              <div key={q.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {q.label}
                      {q.isNegative && (
                        <span style={{ fontSize: 12, color: "#b91c1c", marginLeft: 6 }}>
                          (negative)
                        </span>
                      )}
                    </div>
                    {q.helpText && (
                      <div style={{ fontSize: 12, color: "#64748b" }}>{q.helpText}</div>
                    )}
                    {q.isNegative && (
                      <div style={{ fontSize: 12, color: "#991b1b", marginTop: 4, lineHeight: 1.35 }}>
                        Inverse scale: the lower the number you pick, the more it raises your combined score.
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, flexShrink: 0, textAlign: "right" }}>
                    {answered ? `${storedValue}/${q.maxScore}` : <span style={{ color: "#94a3b8" }}>Not scored</span>}
                  </div>
                </div>

                {!answered ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                      Choose a score (tap a number, including 0)
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {scoreButtons(q.maxScore).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onChange(q.id, n)}
                          style={{
                            minWidth: 36,
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    type="range"
                    min="0"
                    max={q.maxScore}
                    step="1"
                    value={storedValue}
                    onChange={(e) => onChange(q.id, Number(e.target.value))}
                    style={{ width: "100%", marginTop: 8 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
