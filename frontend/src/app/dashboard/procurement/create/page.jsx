"use client";

import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ProcurementRecommendationForm from "@/components/forms/ProcurementRecommendationForm";
import SupplierRecommendationTable from "@/components/procurement/SupplierRecommendationTable";
import { procurementApi } from "@/services/api/procurement.api";

export default function CreateProcurementPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(values) {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const data = await procurementApi.recommend(values);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Smart Procurement"
        description="Find best suppliers using cost & profit analysis"
      />

      <ProcurementRecommendationForm onSubmit={handleSubmit} />

      {loading && <LoadingSpinner label="Analyzing suppliers..." />}

      {error && (
        <p className="text-red-500 mt-3">{error}</p>
      )}

      <SupplierRecommendationTable items={results} />
    </div>
  );
}