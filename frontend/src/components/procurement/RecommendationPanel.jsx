"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import FormField from "@/components/forms/FormField";
import SupplierRecommendationTable from "./SupplierRecommendationTable";
import { procurementApi } from "@/services/api/procurement.api";

export default function RecommendationPanel({ onSave }) {
  const [loading,     setLoading]     = useState(false);
  const [results,     setResults]     = useState([]);
  const [requestData, setRequestData] = useState({});
  const [error,       setError]       = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [values,      setValues]      = useState({
    item_name: "", quantity: "", delivery_location: "",
    required_delivery_date: "", expected_selling_price: "",
  });

  function set(k, v) {
    setValues(p => ({ ...p, [k]: v }));
    setFieldErrors(p => ({ ...p, [k]: undefined }));
  }

  function validate() {
    const e = {};
    if (!values.item_name?.trim())            e.item_name              = "Required.";
    if (!values.quantity || Number(values.quantity) <= 0) e.quantity   = "Enter quantity > 0.";
    if (!values.delivery_location?.trim())    e.delivery_location      = "Required.";
    if (!values.required_delivery_date)       e.required_delivery_date = "Required.";
    if (!values.expected_selling_price || Number(values.expected_selling_price) <= 0)
      e.expected_selling_price = "Enter price > 0.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setLoading(true); setError(null); setResults([]);
    const payload = {
      ...values,
      quantity:               Number(values.quantity),
      expected_selling_price: Number(values.expected_selling_price),
      required_delivery_date: new Date(values.required_delivery_date).toISOString(),
    };
    setRequestData(payload);
    try {
      const d = await procurementApi.recommend(payload);
      setResults(Array.isArray(d) ? d : []);
      if (!d?.length) setError("No suitable suppliers found. Make sure suppliers have unit price, available quantity, and delivery date set.");
    } catch (err) {
      setError(err.message || "Failed to get recommendations.");
    } finally {
      setLoading(false);
    }
  }

  const cls = k => `input-field ${fieldErrors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-2xl space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Item Name" error={fieldErrors.item_name} required>
            <input className={cls("item_name")} value={values.item_name}
              onChange={e => set("item_name", e.target.value)} placeholder="e.g. Rice 5 kg bag" />
          </FormField>
          <FormField label="Quantity" error={fieldErrors.quantity} required>
            <input className={cls("quantity")} type="number" min="0.01" step="0.01"
              value={values.quantity} onChange={e => set("quantity", e.target.value)} />
          </FormField>
          <FormField label="Delivery Location" error={fieldErrors.delivery_location} required>
            <input className={cls("delivery_location")} value={values.delivery_location}
              onChange={e => set("delivery_location", e.target.value)} placeholder="e.g. Colombo" />
          </FormField>
          <FormField label="Required Delivery Date" error={fieldErrors.required_delivery_date} required>
            <input className={cls("required_delivery_date")} type="date"
              value={values.required_delivery_date}
              onChange={e => set("required_delivery_date", e.target.value)} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Expected Selling Price (LKR)" error={fieldErrors.expected_selling_price} required>
              <input className={cls("expected_selling_price")} type="number" min="0.01" step="0.01"
                value={values.expected_selling_price}
                onChange={e => set("expected_selling_price", e.target.value)} />
            </FormField>
          </div>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Analysing..." : "Get Recommendations"}
        </Button>
      </form>

      {loading && <LoadingSpinner label="Analysing suppliers..." />}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {results.length > 0 && (
        <SupplierRecommendationTable
          results={results}
          requestData={requestData}
          onSave={onSave}
        />
      )}
    </div>
  );
}
