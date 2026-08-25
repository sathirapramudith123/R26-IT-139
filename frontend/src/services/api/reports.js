// src/services/api/reports.js
// Uses the named `apiClient` export from ./client (same one your other
// services use internally). Fetches the same endpoint as the Flutter app.
import { apiClient } from "./client";

// Peel axios-style `response.data` and/or an API `{ data: {...} }` envelope,
// stopping once we reach the real statement payload — mirrors the Flutter
// app's `res.containsKey("data") ? res["data"] : res` logic.
function unwrap(res) {
  let body = res;
  for (let i = 0; i < 2; i++) {
    if (
      body &&
      typeof body === "object" &&
      !("total_revenue" in body) &&
      "data" in body
    ) {
      body = body.data;
    }
  }
  return body || {};
}

export const reportApi = {
  // Params: { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' } (optional)
  async getIncomeStatement(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    const res = await apiClient.get(
      `/reports/income-statement${qs ? `?${qs}` : ""}`
    );
    return unwrap(res);
  },
};