"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function PredictionForm({ fields = [], loading = false, onSubmit }) {
  const [formData, setFormData] = useState(() => {
    const initial = {};
    fields.forEach((field) => {
      initial[field.name] = field.default !== undefined ? field.default : "";
    });
    return initial;
  });

  const handleChange = (e, type) => {
    const { name, value } = e.target;
    let parsedValue = value;

    if (type === "number") {
      parsedValue = value === "" ? "" : Number(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label htmlFor={field.name} className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type === "number" ? "number" : "text"}
              step={field.type === "number" ? "any" : undefined}
              value={formData[field.name] ?? ""}
              disabled={loading}
              onChange={(e) => handleChange(e, field.type)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Calculating..." : "Run Prediction"}
        </Button>
      </div>
    </form>
  );
}