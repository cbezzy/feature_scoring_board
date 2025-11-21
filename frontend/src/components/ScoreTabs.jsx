import React, { useState , useMemo } from "react";
import { GROUPS } from "../scoring";

function SliderRow({ item, value, onChange }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"220px 1fr 40px", gap:8, alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
      <div>
        <div style={{ fontWeight:600 }}>{item.label}</div>
        <div style={{ fontSize:12, color:"#64748b" }}>{item.hint}</div>
      </div>

      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(e)=>onChange(Number(e.target.value))}
      />

      <div style={{ fontWeight:700, textAlign:"right" }}>{value}</div>
    </div>
  );
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
          {qs.map(q => {
            const v = answersMap[q.id] ?? Math.round(q.maxScore / 2);
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
                  <div style={{ fontWeight: 700 }}>{v}/{q.maxScore}</div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={q.maxScore}
                  step="1"
                  value={answersMap[q.id] ?? 0}
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
