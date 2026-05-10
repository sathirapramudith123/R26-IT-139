import { apiClient } from "./client";
import { tokenService } from "@/services/auth/tokenService";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export const ledgerApi = {
  list:         ()      => apiClient.get("/ledger"),
  summary:      ()      => apiClient.get("/ledger/summary"),
  paymentSplit: ()      => apiClient.get("/ledger/payment-split"),
  reports:      ()      => apiClient.get("/ledger/reports"),
  getById:      (id)    => apiClient.get(`/ledger/${id}`),
  create:       (p)     => apiClient.post("/ledger", p),
  update:       (id, p) => apiClient.put(`/ledger/${id}`, p),
  remove:       (id)    => apiClient.delete(`/ledger/${id}`),

  /**
   * Download the PDF report as a file.
   * Fetches with the Authorization header (required — endpoint is protected).
   * Triggers browser download automatically.
   */
  async exportPdf() {
    const token = tokenService.getToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${BASE}/ledger/export/pdf`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Export failed (${response.status}): ${text}`);
    }

    // Convert response to blob and trigger download
    const blob = await response.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `lanka_link_ledger_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
