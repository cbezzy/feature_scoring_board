import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const COLORS = {
  status: {
    intake: "#94a3b8",
    triage: "#f59e0b",
    scoring: "#3b82f6",
    ready: "#8b5cf6",
    deferred: "#64748b",
    shipped: "#059669",
  },
  priority: {
    high: "#059669",
    medium: "#d97706",
    low: "#64748b",
  },
};

export default function Dashboard({ features = [] }) {
  const kpis = useMemo(() => {
    const total = features.length;
    const highPriority = features.filter((f) => f.priority === "high").length;
    const scoredFeatures = features.filter((f) => (f.scoreTotals?.length || 0) > 0);
    const avgScore =
      scoredFeatures.length > 0
        ? scoredFeatures.reduce((sum, f) => sum + (f.total || 0), 0) / scoredFeatures.length
        : 0;
    const completionRate =
      total > 0 ? ((scoredFeatures.length / total) * 100).toFixed(1) : 0;

    return {
      total,
      highPriority,
      avgScore: Number(avgScore.toFixed(1)),
      completionRate: Number(completionRate),
    };
  }, [features]);

  const statusData = useMemo(() => {
    const statusCounts = {};
    features.forEach((f) => {
      const status = f.status || "intake";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: COLORS.status[status] || "#94a3b8",
    }));
  }, [features]);

  const priorityData = useMemo(() => {
    const priorityCounts = { high: 0, medium: 0, low: 0 };
    features.forEach((f) => {
      const priority = f.priority || "low";
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });

    return [
      { name: "High", value: priorityCounts.high, color: COLORS.priority.high },
      { name: "Medium", value: priorityCounts.medium, color: COLORS.priority.medium },
      { name: "Low", value: priorityCounts.low, color: COLORS.priority.low },
    ];
  }, [features]);

  const moduleData = useMemo(() => {
    const moduleCounts = {};
    features.forEach((f) => {
      const module = f.module || "Unassigned";
      moduleCounts[module] = (moduleCounts[module] || 0) + 1;
    });

    return Object.entries(moduleCounts)
      .map(([module, count]) => ({
        name: module,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 modules
  }, [features]);

  const scoreDistribution = useMemo(() => {
    const scored = features.filter((f) => (f.total || 0) > 0);
    const buckets = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };

    scored.forEach((f) => {
      const score = f.total || 0;
      if (score <= 20) buckets["0-20"]++;
      else if (score <= 40) buckets["21-40"]++;
      else if (score <= 60) buckets["41-60"]++;
      else if (score <= 80) buckets["61-80"]++;
      else buckets["81-100"]++;
    });

    return Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
    }));
  }, [features]);

  const recentActivity = useMemo(() => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    const activityMap = {};
    features.forEach((f) => {
      const updateDate = new Date(f.updatedAt);
      const dateKey = updateDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!activityMap[dateKey]) {
        activityMap[dateKey] = 0;
      }
      activityMap[dateKey]++;
    });

    return last7Days.map((date) => {
      const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: dateKey,
        count: activityMap[dateKey] || 0,
      };
    });
  }, [features]);

  if (features.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          No features yet
        </div>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          Create your first feature request to see dashboard metrics
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <div className="card">
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Total Features
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
            {kpis.total}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
            High Priority
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#059669" }}>
            {kpis.highPriority}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Avg Score
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
            {kpis.avgScore}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Scoring Complete
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
            {kpis.completionRate}%
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 16,
        }}
      >
        {/* Features by Status */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Features by Status</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Features by Priority */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Features by Priority</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 16,
        }}
      >
        {/* Score Distribution */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Score Distribution</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Modules */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Top Modules</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moduleData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Recent Activity (Last 7 Days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={recentActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

