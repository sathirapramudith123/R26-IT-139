"use client";

import { useCallback, useState } from "react";
import { procurementApi } from "@/services/api/procurement.api";

export default function useProcurement() {
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await procurementApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load procurement decisions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setRecommendationLoading(true);
    setError(null);

    try {
      const data = await procurementApi.getRecommendations();
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to generate recommendations");
      setRecommendations([]);
    } finally {
      setRecommendationLoading(false);
    }
  }, []);

  const saveDecision = useCallback(async (payload) => {
    const created = await procurementApi.create(payload);
    await fetchAll();
    return created;
  }, [fetchAll]);

  const updateDecision = useCallback(async (id, payload) => {
    const updated = await procurementApi.update(id, payload);
    await fetchAll();
    return updated;
  }, [fetchAll]);

  const deleteDecision = useCallback(async (id) => {
    await procurementApi.delete(id);
    await fetchAll();
  }, [fetchAll]);

  return {
    items,
    recommendations,
    loading,
    recommendationLoading,
    error,
    fetchAll,
    fetchRecommendations,
    saveDecision,
    updateDecision,
    deleteDecision,
  };
}