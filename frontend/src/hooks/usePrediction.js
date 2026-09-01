"use client";

import { useState, useCallback } from "react";

// කෙළින්ම FastAPI backend URL එක ලබා දීම
const FASTAPI_URL = "http://127.0.0.1:8000/predict";

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

      // කෙළින්ම FastAPI එකට request එක යැවීම
      const response = await fetch(FASTAPI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          component: component.trim().toLowerCase(),
          features: sanitizedFeatures,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data.detail === "object"
            ? JSON.stringify(data.detail)
            : data.detail || "Prediction request failed";
        throw new Error(errorMessage);
      }

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