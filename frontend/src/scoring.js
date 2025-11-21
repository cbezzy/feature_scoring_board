export const GROUPS = [
  {
    id: "customer_impact",
    title: "Customer Impact",
    items: [
      { id: "tenantCoverage", label: "Tenant Coverage", hint: "How many tenants benefit?" },
      { id: "userCoverage", label: "User Coverage", hint: "How many roles benefit?" },
      { id: "revenueRetention", label: "Revenue / Retention", hint: "Churn/upsell impact?" },
    ],
  },
  {
    id: "engineering_cost",
    title: "Engineering Cost",
    items: [
      { id: "buildComplexity", label: "Build Complexity", hint: "UI-only vs multi-module build" },
      { id: "maintenanceBurden", label: "Maintenance Burden", hint: "Long-term upkeep?" },
      { id: "riskUnknowns", label: "Risk / Unknowns", hint: "Migrations/edge cases/integrations" },
    ],
  },
  {
    id: "ops_infra",
    title: "Ops & Infrastructure",
    items: [
      { id: "performanceLoad", label: "Performance / Load", hint: "DB/API/storage/real-time load" },
      { id: "supportImpact", label: "Support Impact", hint: "Support overhead expected" },
      { id: "securityCompliance", label: "Security / Compliance", hint: "PII/permissions/audits" },
    ],
  },
  {
    id: "strategy",
    title: "Strategic Alignment",
    items: [
      { id: "roadmapFit", label: "Roadmap Fit", hint: "AI/reporting/mobile/automation/etc." },
      { id: "differentiation", label: "Differentiation", hint: "Competitive advantage?" },
      { id: "multitenantReuse", label: "Multi-Tenant Reuse", hint: "Reusable across installs?" },
    ],
  },
];

export const SCORE_KEYS = GROUPS.flatMap(g => g.items.map(i => i.id));

export function totalScore(score = {}) {
  return SCORE_KEYS.reduce((sum, k) => sum + (Number(score[k]) || 0), 0);
}

export function priorityBand(total) {
  if (total >= 36) return { label: "High", color: "#059669" };
  if (total >= 27) return { label: "Medium", color: "#d97706" };
  return { label: "Low", color: "#64748b" };
}
