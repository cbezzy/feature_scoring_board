import React, { useMemo } from "react";

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
            const storedValue = answersMap[q.id];
            const sliderValue = storedValue ?? 0;
            return (
              <div key={q.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
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
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {storedValue != null ? `${storedValue}/${q.maxScore}` : `0/${q.maxScore}`}
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={q.maxScore}
                  step="1"
                  value={sliderValue}
                  onChange={(e) => onChange(q.id, Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
