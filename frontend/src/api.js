const API_BASE = "/api";

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    credentials: "include", // IMPORTANT for cookie auth
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText;
    throw new Error(msg);
  }
  return json;
}

export const api = {
  // ---- Auth ----
  me: () => request("/auth/me"),
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request("/auth/logout", { method: "POST" }),

  // ---- Features ----
  listFeatures: () => request("/features"),
  getFeature: (id) => request(`/features/${id}`),
  createFeature: (payload = {}) =>
    request("/features", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateFeature: (id, payload) =>
    request(`/features/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteFeature: (id) =>
    request(`/features/${id}`, { method: "DELETE" }),

  // ---- Scoring Questions + Answers ----
  listQuestions: () => request("/questions"),
  updateAnswers: (featureId, answers) =>
    request(`/features/${featureId}/answers`, {
      method: "PUT",
      body: JSON.stringify({ answers }),
    }),
    listAdmins: () => request("/admins"),
    createAdmin: (payload) =>
      request("/admins", { method: "POST", body: JSON.stringify(payload) }),
    updateAdmin: (id, payload) =>
      request(`/admins/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

};
