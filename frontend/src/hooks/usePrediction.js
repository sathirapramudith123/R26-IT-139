"use client";

import { useState, useCallback } from "react";

import { predictionApi } from "@/services/api/prediction";

// Predictions go through the backend (/api/v1/predict/:component, signed in), which calls the ML
// service — the browser never talks to the ML service directly, so this also works when hosted.
export default function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = useCallback(async (component, rawFeatures) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sanitizedFeatures = {};
      Object.entries(rawFeatures).forEach(([key, val]) => {
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed === "") {
            sanitizedFeatures[key] = 0;
          } else if (!isNaN(Number(trimmed))) {
            sanitizedFeatures[key] = Number(trimmed);
          } else {
            sanitizedFeatures[key] = trimmed;
          }
        } else {
          sanitizedFeatures[key] = val;
        }
      });

      const data = await predictionApi.predict(component.trim().toLowerCase(), sanitizedFeatures);
      setResult(data);
      return data;
    } catch (err) {
      const msg = err.message || "An unexpected error occurred.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setResult(null);
    setError(null);
  }, []);

  return { loading, result, error, run, reset };
}
