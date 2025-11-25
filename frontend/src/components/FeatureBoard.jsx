import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import FeatureList from "./FeatureList";
import FeatureEditor from "./FeatureEditor";
import AdminsPanel from "./AdminsPanel";
import Dashboard from "./Dashboard";



export default function FeatureBoard({ admin, onLogout }) {
  const [features, setFeatures] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [sortField, setSortField] = useState("priority");
  const [sortOrder, setSortOrder] = useState("desc"); 
  const [mainTab, setMainTab] = useState("dashboard"); // dashboard | features | admins
  const [modules, setModules] = useState([]);
  const activeFeature = features.find((f) => f.id === activeId) || null;

  async function load() {
    const list = await api.listFeatures();
    setFeatures(list);
    setActiveId(list[0]?.id ?? null);
  }

  async function loadModules() {
    try {
      const list = await api.listModules();
      setModules(list);
    } catch (err) {
      console.error("Failed to load modules", err);
    }
  }

  useEffect(() => { 
    load(); 
    loadModules();
  }, []);

  const filteredAndSorted = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = !s
      ? features
      : features.filter(f =>
          [f.title, f.summary, f.requestedBy, f.tenant, (f.tags || []).join(" ")]
            .filter(Boolean)
            .some(x => String(x).toLowerCase().includes(s))
        );

    // Filter by module
    if (moduleFilter) {
      list = list.filter(f => {
        if (moduleFilter === "unassigned") {
          return !f.module || f.module === "";
        }
        return f.module === moduleFilter;
      });
    }

    const direction = sortOrder === "asc" ? 1 : -1;

    const compareText = (k) => (a, b) =>
      String(a[k] || "").localeCompare(String(b[k] || "")) * direction;

    const compareNumber = (k) => (a, b) =>
      ((Number(a[k]) || 0) - (Number(b[k]) || 0)) * direction;

    const compareDate = (k) => (a, b) =>
      (new Date(a[k] || 0) - new Date(b[k] || 0)) * direction;

    const comparePriority = () => {
      const rank = { high: 3, medium: 2, low: 1 };
      return (a, b) =>
        ((rank[a.priority] || 0) - (rank[b.priority] || 0)) * direction;
    };

    switch (sortField) {
      case "title":
        list = [...list].sort(compareText("title"));
        break;
      case "status":
        list = [...list].sort(compareText("status"));
        break;
      case "priority":
        list = [...list].sort(comparePriority());
        break;
      case "total":
        list = [...list].sort(compareNumber("total"));
        break;
      case "createdAt":
        list = [...list].sort(compareDate("createdAt"));
        break;
      case "updatedAt":
        list = [...list].sort(compareDate("updatedAt"));
        break;
      default:
        break;
    }

    return list;
  }, [features, search, moduleFilter, sortField, sortOrder]);

  const todoFeatures = useMemo(() => {
    if (!admin?.id) return [];
    return features.filter((f) => {
      const totals = Array.isArray(f.scoreTotals) ? f.scoreTotals : [];
      return !totals.some((entry) => entry.adminId === admin.id);
    });
  }, [features, admin?.id]);

  // Calculate feature counts per module
  const moduleCounts = useMemo(() => {
    const counts = {};
    features.forEach((f) => {
      const module = f.module || "unassigned";
      counts[module] = (counts[module] || 0) + 1;
    });
    return counts;
  }, [features]);



  async function createNew() {
    const fr = await api.createFeature({});
    await load();
    setActiveId(fr.id);
  }

  async function patchFeature(id, payload) {
    await api.updateFeature(id, payload);
    await load();
  }

  async function removeFeature(id) {
    await api.deleteFeature(id);
    await load();
  }

  function replaceFeatureInList(updated) {
    setFeatures((prev) =>
      prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
    );
  }


  return (
     <div className="app-shell">
      <FeatureList
        admin={admin}
        mainTab={mainTab}
        onChangeMainTab={setMainTab}
        search={search}
        onSearch={setSearch}
        moduleFilter={moduleFilter}
        onModuleFilter={setModuleFilter}
        modules={modules}
        moduleCounts={moduleCounts}
        sortField={sortField}
        onSortField={setSortField}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
        features={filteredAndSorted}
        activeId={activeId}
        onSelect={(id) => {
          if (mainTab !== "features") {
            setMainTab("features");
          }
          setActiveId(id);
        }}
        onCreate={createNew}
        onLogout={onLogout}
        todoFeatures={todoFeatures}
      />


      <div className="main">
        {mainTab === "dashboard" ? (
          <Dashboard features={features} />
        ) : mainTab === "admins" ? (
          <AdminsPanel />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeFeature ? (
              <FeatureEditor
                admin={admin}
                feature={activeFeature}
                onPatch={(payload) => patchFeature(activeFeature.id, payload)}
                onPatchScores={replaceFeatureInList}
                onDelete={() => removeFeature(activeFeature.id)}
              />
            ) : (
              <div style={{ padding: 16, color: "#64748b" }}>
                Select a feature to edit
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
