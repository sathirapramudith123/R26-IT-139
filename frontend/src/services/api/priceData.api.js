import { apiClient } from "./client";
import { tokenService } from "@/services/auth/tokenService";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export const priceDataApi = {
  getLatest:    () => apiClient.get("/price-data/latest"),
  getDates:     () => apiClient.get("/price-data/dates"),
  getAnalytics: () => apiClient.get("/price-data/analytics"),

  async uploadPdf(file) {
    const token = tokenService.getToken();
    const form  = new FormData();
    form.append("file", file);
    const res  = await fetch(`${BASE_URL}/price-data/upload`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body:    form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },

  async downloadCsv() {
    const token = tokenService.getToken();
    const res   = await fetch(`${BASE_URL}/price-data/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `hkarti_prices_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  },
};