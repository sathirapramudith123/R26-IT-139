"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { supplierApi } from "@/services/api/supplier";
import { isValidEmail } from "@/lib/validators";
import { INVENTORY_UNITS } from "@/lib/constants";

// LocationPickerMap uses Leaflet, which touches `window` — must be loaded
// client-side only, same as it's used on the Procurement form.
const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), { ssr: false });

const emptySupplyItem = { item_name: "", quantity: "", unit: "kg", unit_price: "" };

// Accepts the old TEXT[] shape (["Rice","Sugar"]) so existing suppliers
// saved before this change still render fine, alongside the new
// [{item_name, quantity, unit, unit_price}] shape.
function normalizeSuppliedItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) =>
    typeof it === "string"
      ? { item_name: it, quantity: "", unit: "kg", unit_price: "" }
      : {
          item_name: it.item_name ?? "",
          quantity: it.quantity ?? "",
          unit: it.unit ?? "kg",
          unit_price: it.unit_price ?? "",
        }
  );
}

export default function SupplierForm({ initialData = {}, supplierId = null }) {
  const router = useRouter();
  const isEdit = !!supplierId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});

  const [v, setV] = useState({
    name:               initialData.name               ?? "",
    company_name:       initialData.company_name       ?? "",
    contact_number:     initialData.contact_number     ?? "",
    email:              initialData.email              ?? "",
    delivery_cost:      initialData.delivery_cost      ?? "",
    lead_time_days:     initialData.lead_time_days     ?? "1", // AI Reorder Safety Stock Model සඳහා
  });

  // ✅ Items Supplied + Available Quantity දෙකම මෙතනට — item එකකට quantity
  // එකක් වශයෙන් (Procurement form එකේ "Add Item" pattern එකම).
  const [suppliedItems, setSuppliedItems] = useState(normalizeSuppliedItems(initialData.items_supplied));
  const [supplyItem, setSupplyItem] = useState(emptySupplyItem);
  const [supplyItemErrors, setSupplyItemErrors] = useState({});

  const totalAvailableQuantity = suppliedItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  function setSupplyItemField(k, val) {
    setSupplyItem((p) => ({ ...p, [k]: val }));
    setSupplyItemErrors((p) => ({ ...p, [k]: undefined }));
  }

  function addSuppliedItem() {
    const er = {};
    if (!supplyItem.item_name.trim()) er.item_name = "Item name is required.";
    if (supplyItem.quantity === "" || Number(supplyItem.quantity) <= 0) er.quantity = "Enter a valid quantity.";
    if (supplyItem.unit_price !== "" && Number(supplyItem.unit_price) < 0) er.unit_price = "Unit price cannot be negative.";
    if (Object.keys(er).length) { setSupplyItemErrors(er); return; }

    setSuppliedItems((prev) => [
      ...prev,
      {
        item_name: supplyItem.item_name.trim(),
        quantity: Number(supplyItem.quantity),
        unit: supplyItem.unit || "kg",
        unit_price: supplyItem.unit_price === "" ? 0 : Number(supplyItem.unit_price),
      },
    ]);
    setSupplyItem(emptySupplyItem);
    setSupplyItemErrors({});
  }

  function removeSuppliedItem(index) {
    setSuppliedItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ✅ Delivery Location dropdown එක අයින් කරලා — Procurement form එකේම
  // "Location" pattern එකම: full auto-filled address string + map pin.
  // District එකත් මේ address string එකේම ඇතුළත් වෙනවා.
  const [location, setLocation] = useState(initialData.delivery_location ?? "");
  const [coords, setCoords] = useState(
    initialData.latitude != null && initialData.longitude != null
      ? { lat: Number(initialData.latitude), lng: Number(initialData.longitude) }
      : null
  );

  function set(k, val) {
    setV(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  // Procurement form එකේම copy — browser GPS එකෙන් coords ලබාගෙන,
  // address field එක හිස් නම් coordinates විදිහටම pre-fill කරනවා.
  function handleLocate() {
    if (!navigator.geolocation) {
      setErrors(p => ({ ...p, location: "Geolocation isn't supported on this browser." }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setErrors(p => ({ ...p, location: undefined }));
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((r) => r.json())
          .then((d) => setLocation(d.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`))
          .catch(() => setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`));
      },
      () => setErrors(p => ({ ...p, location: "Couldn't get your location. Try picking it on the map instead." })),
      { enableHighAccuracy: true }
    );
  }

  // Procurement form එකේම copy — map click කළ coordinate එකට reverse-geocode
  // කරලා, full formatted address string එකෙන් Location field එක fill කරනවා.
  function handleMapPick(lat, lng, displayName) {
    setCoords({ lat, lng });
    setErrors(p => ({ ...p, location: undefined }));
    if (displayName) { setLocation(displayName); return; }
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((r) => r.json())
      .then((d) => setLocation(d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`))
      .catch(() => setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};

    // 1. Basic Required Validation
    if (!v.name.trim()) er.name = "Supplier name is required.";

    // 2. Contact Number Format Check (Sri Lankan / General 9-10 Digits)
    const cleanPhone = v.contact_number.replace(/\D/g, "");
    if (!v.contact_number.trim()) {
      er.contact_number = "Contact number is required.";
    } else if (cleanPhone.length < 9 || cleanPhone.length > 12) {
      er.contact_number = "Enter a valid contact number (e.g. 0771234567).";
    }

    // 3. Email Check
    if (v.email && !isValidEmail(v.email)) {
      er.email = "Enter a valid email address.";
    }

    // 4. Numeric Inputs Non-negative Validation
    if (v.delivery_cost !== "" && Number(v.delivery_cost) < 0) {
      er.delivery_cost = "Delivery cost cannot be negative.";
    }
    if (v.lead_time_days !== "" && Number(v.lead_time_days) < 0) {
      er.lead_time_days = "Lead time cannot be negative.";
    }

    // Errors තිබේ නම් Form Submission එක නතර කිරීම
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true);
    setServerError(null);

    // Backend Payload එක සකස් කිරීම (Numbers බවට Convert කිරීම)
    const payload = {
      ...v,
      delivery_location: location.trim(),
      delivery_cost: v.delivery_cost === "" ? 0 : Number(v.delivery_cost),
      lead_time_days: v.lead_time_days === "" ? 1 : Number(v.lead_time_days),
      items_supplied: suppliedItems,             // [{item_name, quantity}]
      available_quantity: totalAvailableQuantity, // derived — sum of all item quantities
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    };

    try {
      if (isEdit) await supplierApi.update(supplierId, payload);
      else await supplierApi.create(payload);
      router.push("/dashboard/suppliers");
    } catch (err) {
      setServerError(err.message || "Failed to save supplier details.");
    } finally {
      setSaving(false);
    }
  }

  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl mx-auto space-y-5">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Supplier Name" error={errors.name} required>
          <input className={cls("name")} value={v.name} onChange={e => set("name", e.target.value)} placeholder="e.g. ABC Traders" />
        </FormField>

        <FormField label="Company Name">
          <input className="input-field" value={v.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. ABC Holdings (Pvt) Ltd" />
        </FormField>

        <FormField label="Contact Number" error={errors.contact_number} required>
          <input className={cls("contact_number")} value={v.contact_number} onChange={e => set("contact_number", e.target.value)} placeholder="0771234567" />
        </FormField>

        <FormField label="Email" error={errors.email}>
          <input className={cls("email")} type="email" value={v.email} onChange={e => set("email", e.target.value)} placeholder="supplier@example.com" />
        </FormField>

        <FormField label="Delivery Cost (LKR)" error={errors.delivery_cost} hint="Fixed delivery fee per shipment">
          <input className={cls("delivery_cost")} type="number" min="0" step="0.01" value={v.delivery_cost} onChange={e => set("delivery_cost", e.target.value)} placeholder="0.00" />
        </FormField>

        {/* Dynamic Safety Stock Reorder Engine එකට අවශ්‍ය Lead Time */}
        <FormField label="Delivery Lead Time (Days)" error={errors.lead_time_days} hint="Days needed to deliver items (For AI Reorder Buffer)">
          <input className={cls("lead_time_days")} type="number" min="0" step="1" value={v.lead_time_days} onChange={e => set("lead_time_days", e.target.value)} placeholder="e.g. 2" />
        </FormField>
      </div>

      {/* ✅ Items Supplied + Available Quantity — item එකකට quantity එකක්,
          Procurement form එකේ "Add Item" pattern එකම. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="bg-blue-50 px-5 py-4 text-base font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
          Items Supplied
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_100px_100px_130px_auto] sm:items-end">
            <FormField label="Item Name" error={supplyItemErrors.item_name}>
              <input
                className={supplyItemErrors.item_name ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                value={supplyItem.item_name}
                onChange={(e) => setSupplyItemField("item_name", e.target.value)}
                placeholder="e.g. Rice 5kg"
              />
            </FormField>
            <FormField label="Quantity" error={supplyItemErrors.quantity}>
              <input
                className={supplyItemErrors.quantity ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                type="number" min="0" step="0.01"
                value={supplyItem.quantity}
                onChange={(e) => setSupplyItemField("quantity", e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Unit">
              <select className="select-field" value={supplyItem.unit} onChange={(e) => setSupplyItemField("unit", e.target.value)}>
                {INVENTORY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </FormField>
            <FormField label="Unit Price (LKR)" error={supplyItemErrors.unit_price}>
              <input
                className={supplyItemErrors.unit_price ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                type="number" min="0" step="0.01"
                value={supplyItem.unit_price}
                onChange={(e) => setSupplyItemField("unit_price", e.target.value)}
                placeholder="0.00"
              />
            </FormField>
            <Button type="button" variant="secondary" onClick={addSuppliedItem}>+ Add Item</Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-3 py-3 text-left font-semibold">#</th>
                  <th className="px-3 py-3 text-left font-semibold">Item</th>
                  <th className="px-3 py-3 text-right font-semibold">Quantity</th>
                  <th className="px-3 py-3 text-left font-semibold">Unit</th>
                  <th className="px-3 py-3 text-right font-semibold">Unit Price (LKR)</th>
                  <th className="px-3 py-3 text-center font-semibold">✕</th>
                </tr>
              </thead>
              <tbody>
                {suppliedItems.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No items added yet.</td></tr>
                ) : (
                  suppliedItems.map((it, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-100">{it.item_name}</td>
                      <td className="px-3 py-3 text-right">{it.quantity}</td>
                      <td className="px-3 py-3 text-slate-500">{it.unit}</td>
                      <td className="px-3 py-3 text-right">{Number(it.unit_price || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-center">
                        <button type="button" onClick={() => removeSuppliedItem(i)} className="text-red-500 hover:text-red-700" aria-label="Remove">✕</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="text-right text-sm font-bold text-blue-700 dark:text-blue-300">
            Total Available Quantity: {totalAvailableQuantity}
          </div>
        </div>
      </div>

      {/* ✅ Location + map — same pattern as the Procurement form:
          address field auto-fills from the map pin (district included). */}
      <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField label="Location" error={errors.location}>
              <input
                className={cls("location")}
                value={location}
                onChange={(e) => { setLocation(e.target.value); setErrors(p => ({ ...p, location: undefined })); }}
                placeholder="e.g. Panguwa, Thambana, Monaragala District"
              />
            </FormField>
          </div>
          <Button type="button" onClick={handleLocate}>📍 Use My Location</Button>
        </div>
        <p className="text-xs text-slate-400">Tip: You can click on the map and pick the exact location</p>
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <LocationPickerMap coords={coords} onPick={handleMapPick} />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/suppliers"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update Supplier" : "Add Supplier")}</Button>
      </div>
    </form>
  );
}