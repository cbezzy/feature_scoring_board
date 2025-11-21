const SCORE_KEYS = [
  "tenantCoverage","userCoverage","revenueRetention",
  "buildComplexity","maintenanceBurden","riskUnknowns",
  "performanceLoad","supportImpact","securityCompliance",
  "roadmapFit","differentiation","multitenantReuse"
];

function totalScore(score) {
  return SCORE_KEYS.reduce((sum, k) => sum + (Number(score[k]) || 0), 0);
}

function priorityBand(total) {
  if (total >= 36) return "high";
  if (total >= 27) return "medium";
  return "low";
}

module.exports = { SCORE_KEYS, totalScore, priorityBand };
