"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { procurementApi } from "@/services/api/procurement";
import { inventoryApi } from "@/services/api/inventory";
import { INVENTORY_UNITS } from "@/lib/constants";

// Leaflet needs the browser's `window` object, so it can't be
// server-rendered. Loading it dynamically with ssr:false avoids build
// errors under Next.js.
const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), { ssr: false });

const today = () => new Date().toISOString().slice(0, 10);
// PR number eka auto generate (edit ekedi initialData eken enawa)
const genPrNo = () => `PR-${String(Date.now()).slice(-5)}`;

const emptyItem = { item_name: "", unit: "unit", quantity: "" };

export default function ProcurementForm({ initialData = {}, procurementId = null }) {
  const router = useRouter();
  const isEdit = !!procurementId;

  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  // ---- Header fields ----
  const [date, setDate] = useState(initialData.date ?? today());
  const [prNo, setPrNo] = useState(initialData.procurement_no ?? initialData.no ?? genPrNo());

  // ---- Footer / shared fields ----
  const [location, setLocation] = useState(initialData.delivery_location ?? initialData.location ?? "");
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [arrivalDate, setArrivalDate] = useState(initialData.arrival_date ?? "");
  const [specialNote, setSpecialNote] = useState(initialData.special_note ?? "");

  // ---- Current item being composed ----
  const [item, setItem] = useState(emptyItem);
  const [itemErrors, setItemErrors] = useState({});

  // ---- Added items table ----
  const [items, setItems] = useState(Array.isArray(initialData.items) ? initialData.items : []);
  const [topErrors, setTopErrors] = useState({});

  // ---- Data source (inventory item names) ----
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    inventoryApi.list()
      .then((d) => setInventory(Array.isArray(d) ? d : []))
      .catch(() => setInventory([]));
  }, []);

  const itemNames = inventory.map((i) => i.name).filter(Boolean);
  const itemNameOptions = [...itemNames];
  if (item.item_name && !itemNameOptions.includes(item.item_name)) {
    itemNameOptions.unshift(item.item_name);
  }

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  function setItemField(k, val) {
    setItem((p) => ({ ...p, [k]: val }));
    setItemErrors((p) => ({ ...p, [k]: undefined }));
  }

  // ---- Add item to table ----
  function addItem() {
    const er = {};
    if (!item.item_name.trim()) er.item_name = "Item name required.";
    if (item.quantity === "" || Number(item.quantity) <= 0) er.quantity = "Enter a valid quantity.";
    if (!item.unit) er.unit = "Select a unit.";

    if (Object.keys(er).length) { setItemErrors(er); return; }

    setItems((prev) => [
      ...prev,
      { item_name: item.item_name.trim(), unit: item.unit, quantity: Number(item.quantity) },
    ]);
    setItem(emptyItem);
    setItemErrors({});
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ---- Locate on map: browser geolocation ----
  function handleLocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        if (!location.trim()) setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }

  // ---- Map click or search select: pick the exact point on the map ----
  // displayName is passed when this comes from the search box (Nominatim
  // already gave us the address text, so no need to reverse-geocode again).
  function handleMapPick(lat, lng, displayName) {
    setCoords({ lat, lng });
    setTopErrors((p) => ({ ...p, location: undefined }));

    if (displayName) {
      setLocation(displayName);
      return;
    }

    // Free reverse-geocoding via OpenStreetMap's Nominatim service.
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((r) => r.json())
      .then((d) => setLocation(d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`))
      .catch(() => setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`));
  }

  // ---- Clear ----
  function handleClear() {
    setDate(today());
    setLocation("");
    setCoords(null);
    setArrivalDate("");
    setSpecialNote("");
    setItem(emptyItem);
    setItems([]);
    setItemErrors({});
    setTopErrors({});
    setServerError(null);
  }

  // ---- Submit ----
  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (items.length === 0) er.items = "Add at least one item.";
    if (!location.trim()) er.location = "Location is required.";
    if (!arrivalDate) er.arrivalDate = "Arrival date is required.";

    if (Object.keys(er).length) { setTopErrors(er); return; }

    setSaving(true); setServerError(null);

    const payload = {
      procurement_no: prNo,
      date,
      delivery_location: location.trim(),
      coords,
      arrival_date: arrivalDate,
      special_note: specialNote.trim(),
      items,                 // multi-item array
      status: "pending",
    };

    try {
      if (isEdit) await procurementApi.update(procurementId, payload);
      else await procurementApi.create(payload);
      router.push("/dashboard/procurement");
    } catch (err) {
      setServerError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-5xl space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* ================= Header: title + Date + No. ================= */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">New Procurement</h1>
        <div className="flex items-end gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-500">Date:</label>
            <input
              className="input-field w-40"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ================= Item Details ================= */}
      <div className="card-elevated space-y-5">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Item Details</h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ---- Item Information card ---- */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 bg-blue-50 px-5 py-4 text-base font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Item Information
            </div>
            <div className="space-y-4 p-5">
              <FormField label="Item Name" error={itemErrors.item_name} required>
                <select
                  className={itemErrors.item_name ? "select-field border-red-400 ring-2 ring-red-100" : "select-field"}
                  value={item.item_name}
                  onChange={(e) => setItemField("item_name", e.target.value)}
                >
                  <option value="">Select item</option>
                  {itemNameOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Quantity" error={itemErrors.quantity} required>
                <input
                  className={itemErrors.quantity ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => setItemField("quantity", e.target.value)}
                  placeholder="Enter quantity"
                />
              </FormField>

              <FormField label="Unit" error={itemErrors.unit} required>
                <select
                  className={itemErrors.unit ? "select-field border-red-400 ring-2 ring-red-100" : "select-field"}
                  value={item.unit}
                  onChange={(e) => setItemField("unit", e.target.value)}
                >
                  <option value="">Select unit</option>
                  {INVENTORY_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </FormField>

              <Button type="button" variant="secondary" onClick={addItem}>
                + Add Item
              </Button>
            </div>
          </div>

          {/* ---- Added items card ---- */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 bg-blue-50 px-5 py-4 text-base font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6a1 1 0 00.9 1.4H19M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              Added items
            </div>
            <div className="p-5">
              {topErrors.items && <p className="mb-3 text-sm text-red-600">{topErrors.items}</p>}

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <th className="px-4 py-3 text-left font-semibold">#</th>
                      <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No items added yet.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{it.item_name}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{it.unit}</td>
                          <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-100">{it.quantity}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="text-red-500 transition hover:text-red-700"
                              aria-label="Remove item"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v11a2 2 0 002 2h4a2 2 0 002-2V7" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm font-bold text-blue-700 dark:text-blue-300">
                <span>Total Items: {totalItems}</span>
                <span>Total Quantity: {totalQuantity}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Location + map ================= */}
      <div className="card-elevated space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField label="Location" error={topErrors.location} required>
              <input
                className={topErrors.location ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setTopErrors((p) => ({ ...p, location: undefined }));
                }}
                placeholder="e.g. SLIIT, New Kandy Rd, Malabe"
              />
            </FormField>
          </div>
          <Button type="button" onClick={handleLocate}>📍 Use My Location</Button>
        </div>

        <p className="text-xs text-slate-400">
          Tip: map එකේ click කරලත් exact location එක pick කරගන්න පුළුවන්.
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <LocationPickerMap coords={coords} onPick={handleMapPick} />
        </div>
      </div>

      {/* ================= Arrival Date + Special Note ================= */}
      <div className="card-elevated grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Arrival Date" error={topErrors.arrivalDate} required>
          <input
            className={topErrors.arrivalDate ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
            type="date"
            value={arrivalDate}
            onChange={(e) => {
              setArrivalDate(e.target.value);
              setTopErrors((p) => ({ ...p, arrivalDate: undefined }));
            }}
          />
        </FormField>

        <FormField label="Special Note">
          <textarea
            className="input-field min-h-[110px] resize-y"
            value={specialNote}
            onChange={(e) => setSpecialNote(e.target.value)}
            placeholder="Enter special note here..."
          />
        </FormField>
      </div>

      {/* ================= Footer buttons ================= */}
      <div className="flex justify-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : (isEdit ? "Update" : "Save")}
        </Button>
        <Button type="button" variant="secondary" onClick={handleClear}>Clear</Button>
        <Link href="/dashboard/procurement">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}