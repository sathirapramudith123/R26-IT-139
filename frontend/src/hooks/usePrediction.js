"use client";
import { useState } from "react";
import { predictionApi } from "@/services/api/prediction";

export default function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function run(component, features) {
    setLoading(true); setError(null); setResult(null);
    try { const d = await predictionApi.predict(component, features); setResult(d); return d; }
    catch (e) { setError(e.message || "Prediction failed"); throw e; }
    finally { setLoading(false); }
  }
  return { loading, result, error, run };
}