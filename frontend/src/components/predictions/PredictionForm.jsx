"use client";
import { useState } from "react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";

export default function PredictionForm({ fields, onSubmit, loading }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, f.default ?? ""])));
  function set(k, v) { setValues(p => ({ ...p, [k]: v })); }
  function handleSubmit(e) {
    e.preventDefault();
    const features = {};
    for (const f of fields) features[f.name] = f.type === "number" ? Number(values[f.name]) : values[f.name];
    onSubmit(features);
  }
  return (
    <form onSubmit={handleSubmit} className="card-elevated max-w-3xl space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {fields.map(f => (
          <FormField key={f.name} label={f.label} required>
            {f.options
              ? <select className="select-field" value={values[f.name]} onChange={e => set(f.name, e.target.value)}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              : <input className="input-field" type={f.type === "number" ? "number" : "text"} step="any"
                  value={values[f.name]} onChange={e => set(f.name, e.target.value)} placeholder={f.label} />}
          </FormField>
        ))}
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-5">
        <Button type="submit" disabled={loading}>{loading ? "Predicting..." : "Run Prediction"}</Button>
      </div>
    </form>
  );
}