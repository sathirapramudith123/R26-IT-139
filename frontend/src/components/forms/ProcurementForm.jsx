"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { procurementApi } from "@/services/api/procurement";
import { inventoryApi } from "@/services/api/inventory";
import { supplierApi } from "@/services/api/supplier";
import { INVENTORY_UNITS } from "@/lib/constants";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), { ssr: false });

const today = () => new Date().toISOString().slice(0, 10);
const genPrNo = () => `PR-${String(Date.now()).slice(-5)}`;

// Haversine formula — straight-line distance (km) between two lat/lng points.
// Good enough for "which supplier is closest to this delivery point" without
// needing a routing API.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Expected arrival = order date + the chosen supplier's delivery lead time
// (days). Replaces manually typing an Arrival Date — we now derive it from
// how long the best-match supplier said they take to deliver.
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toISOString().slice(0, 10);
}

// unit_cost එකතු කළා — RECEIVED කරාම batch එකේ cost එකට යනවා
const emptyItem = { item_name: "", unit: "unit", quantity: "", unit_cost: "" };

export default function ProcurementForm({ initialData = {}, procurementId = null }) {
  const router = useRouter();
  const isEdit = !!procurementId;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSuppliers, setSavedSuppliers] = useState([]);
  const [serverError, setServerError] = useState(null);

  const [date, setDate] = useState(initialData.date ?? initialData.order_date ?? today());
  const [prNo, setPrNo] = useState(initialData.procurement_no ?? initialData.no ?? genPrNo());

  const [location, setLocation] = useState(initialData.delivery_location ?? initialData.location ?? "");
  const [coords, setCoords] = useState(initialData.coords ?? null);
  const [specialNote, setSpecialNote] = useState(initialData.special_note ?? "");

  const [item, setItem] = useState(emptyItem);
  const [itemErrors, setItemErrors] = useState({});

  const [items, setItems] = useState(Array.isArray(initialData.items) ? initialData.items : []);
  const [topErrors, setTopErrors] = useState({});

  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    inventoryApi.list()
      .then((d) => setInventory(Array.isArray(d) ? d : []))
      .catch(() => setInventory([]));
  }, []);

  useEffect(() => {
    supplierApi.list()
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => setSuppliers([]));
  }, []);

  const inventoryItemNames = inventory.map((i) => i.name).filter(Boolean);

  // ✅ Also pull in every item name suppliers have listed under items_supplied
  // — a merchant should be able to procure something a supplier carries even
  // before it exists as an Inventory record.
  const supplierItemNamesFlat = suppliers.flatMap((s) =>
    Array.isArray(s.items_supplied) ? s.items_supplied.map((it) => it.item_name).filter(Boolean) : []
  );

  const itemNames = [...new Set([...inventoryItemNames, ...supplierItemNamesFlat])];
  const itemNameOptions = [...itemNames];
  if (item.item_name && !itemNameOptions.includes(item.item_name)) {
    itemNameOptions.unshift(item.item_name);
  }

  // ✅ Suppliers that supply the item currently selected in the entry form —
  // matched against each supplier's items_supplied list. Only suppliers with
  // a saved map pin (latitude/longitude) can be shown on the map, so those
  // without one are left out of the "on map" set but still worth knowing
  // about — kept separate so we can mention them without pinning them.
  const matchingSuppliers = suppliers.filter((s) =>
    Array.isArray(s.items_supplied) &&
    s.items_supplied.some(
      (it) => it.item_name?.trim().toLowerCase() === item.item_name.trim().toLowerCase()
    )
  );

  // ✅ Enrich each matching supplier with everything needed to compare them
  // properly: item price (+ their flat delivery fee) as "estimated cost",
  // distance to the chosen delivery point, and their stated delivery lead
  // time — instead of just picking by distance alone.
  const enrichedSuppliers = matchingSuppliers.map((s) => {
    const supplierItem = s.items_supplied.find(
      (it) => it.item_name?.trim().toLowerCase() === item.item_name.trim().toLowerCase()
    );
    const unitPrice = Number(supplierItem?.unit_price) || 0;
    const qty = Number(item.quantity) || 1;
    const estimatedCost = unitPrice * qty + (Number(s.delivery_cost) || 0);
    const leadTimeDays = Number(s.lead_time_days) || 0;
    const dKm = coords && s.latitude != null && s.longitude != null
      ? distanceKm(coords.lat, coords.lng, Number(s.latitude), Number(s.longitude))
      : null;
    return { ...s, unitPrice, estimatedCost, leadTimeDays, distanceKm: dKm };
  });

  const mappableSuppliers = enrichedSuppliers.filter((s) => s.latitude != null && s.longitude != null);

  // Min-max normalize a metric across candidates (0 = best/lowest, 1 =
  // worst/highest) so cost (LKR), distance (km) and lead time (days) —
  // three different units — can be summed into one comparable score.
  function normalizer(list, key) {
    const vals = list.map((s) => s[key]).filter((v) => v != null && !isNaN(v));
    if (vals.length === 0) return () => 0;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return (v) => (v == null || isNaN(v) || max === min ? 0 : (v - min) / (max - min));
  }

  const costNorm = normalizer(enrichedSuppliers, "estimatedCost");
  const leadNorm = normalizer(enrichedSuppliers, "leadTimeDays");
  const distNorm = normalizer(mappableSuppliers, "distanceKm");

  const scoredSuppliers = enrichedSuppliers
    .map((s) => ({
      ...s,
      score: costNorm(s.estimatedCost) + leadNorm(s.leadTimeDays) + (s.distanceKm != null ? distNorm(s.distanceKm) : 0),
    }))
    .sort((a, b) => a.score - b.score);

  const suppliersWithDistance = scoredSuppliers; // kept name for the map-marker code below
  const bestOverallId = scoredSuppliers[0]?.id;
  const nearestSupplierId = coords && mappableSuppliers.length
    ? [...mappableSuppliers].sort((a, b) => a.distanceKm - b.distanceKm)[0].id
    : null;
  const cheapestSingleId = enrichedSuppliers.length
    ? [...enrichedSuppliers].sort((a, b) => a.estimatedCost - b.estimatedCost)[0].id
    : null;
  const fastestSingleId = enrichedSuppliers.length
    ? [...enrichedSuppliers].sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0].id
    : null;

  // ✅ Whole-order matching — once items have been added, find which
  // supplier(s) can fulfil the most of the basket (not just the single item
  // currently being typed into the entry form). Ranked by how many of the
  // added items they carry, then by distance to the delivery point.
  const orderItemNames = items.map((it) => it.item_name.trim().toLowerCase());

  const orderSupplierCandidates = orderItemNames.length === 0 ? [] : suppliers
    .map((s) => {
      const supplierItems = Array.isArray(s.items_supplied) ? s.items_supplied : [];
      const supplierItemNames = supplierItems.map((si) => si.item_name?.trim().toLowerCase());
      const matchedCount = orderItemNames.filter((n) => supplierItemNames.includes(n)).length;
      const matchedItems = items
        .filter((it) => supplierItemNames.includes(it.item_name.trim().toLowerCase()))
        .map((it) => it.item_name);
      const missing = items
        .filter((it) => !supplierItemNames.includes(it.item_name.trim().toLowerCase()))
        .map((it) => it.item_name);
      // ✅ What it would cost to buy the items this supplier carries, using
      // their own per-item unit_price — powers the "Cheapest" comparison.
      const totalPrice = items.reduce((sum, it) => {
        const match = supplierItems.find(
          (si) => si.item_name?.trim().toLowerCase() === it.item_name.trim().toLowerCase()
        );
        return match ? sum + (Number(it.quantity) || 0) * (Number(match.unit_price) || 0) : sum;
      }, 0);
      return {
        ...s,
        matchedCount,
        matchedItems,
        missing,
        totalPrice,
        fullMatch: matchedCount === orderItemNames.length,
        distanceKm: coords && s.latitude != null && s.longitude != null
          ? distanceKm(coords.lat, coords.lng, Number(s.latitude), Number(s.longitude))
          : null,
      };
    })
    .filter((s) => s.matchedCount > 0)
    .sort((a, b) => b.matchedCount - a.matchedCount || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  const bestOrderSupplierId = orderSupplierCandidates[0]?.id;

  // ✅ Cheapest of the matching suppliers, by total price for the items
  // they carry (not necessarily a full-match supplier — coverage is shown
  // alongside so the comparison stays honest).
  const cheapestSupplierId = orderSupplierCandidates.length > 0
    ? orderSupplierCandidates.reduce((min, s) => (s.totalPrice < min.totalPrice ? s : min), orderSupplierCandidates[0]).id
    : null;

  // Map markers: once the order has items, show whole-order coverage
  // (best-match = green, cheapest = gold) instead of the single-item view.
  const supplierMapMarkers = orderItemNames.length > 0
    ? orderSupplierCandidates
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          label: `${s.name} — ${s.matchedCount}/${orderItemNames.length} items`
            + (s.fullMatch ? " ✓ full match" : "")
            + ` — LKR ${s.totalPrice.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
            + (s.id === cheapestSupplierId ? " (cheapest)" : "")
            + (s.distanceKm != null ? ` — ${s.distanceKm.toFixed(1)} km` : ""),
          highlight: s.id === bestOrderSupplierId,
          cheapest: s.id === cheapestSupplierId,
        }))
    : suppliersWithDistance
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          label: `${s.name}`
            + ` — LKR ${s.estimatedCost.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
            + ` · ${s.leadTimeDays}d lead time`
            + (s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ""),
          highlight: s.id === bestOverallId,
          cheapest: s.id === cheapestSingleId && s.id !== bestOverallId,
        }));

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  // Grand total cost = සියලු items වල (qty × unit_cost) එකතුව
  const totalCost = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0);

  function setItemField(k, val) {
    setItem((p) => ({ ...p, [k]: val }));
    setItemErrors((p) => ({ ...p, [k]: undefined }));
  }

  // Item එකක් තෝරද්දි — Inventory එකේ තියෙනවා නම් ඒකේ cost එකෙන් pre-fill;
  // නැත්නම් (item එක supplier කෙනෙක්ගේ items_supplied එකේ විතරක් තියෙනවා
  // නම්) ඒ supplier ලාගේ unit_price/unit එකෙන් pre-fill (edit කරන්න පුළුවන්).
  function pickItemName(name) {
    const inv = inventory.find((i) => i.name === name);
    if (inv) {
      setItem((p) => ({
        ...p,
        item_name: name,
        unit_cost: String(Number(inv.cost_price ?? inv.unit_price ?? 0)),
      }));
    } else {
      const supplierMatch = suppliers
        .flatMap((s) => (Array.isArray(s.items_supplied) ? s.items_supplied : []))
        .find((it) => it.item_name?.trim().toLowerCase() === name.trim().toLowerCase());
      setItem((p) => ({
        ...p,
        item_name: name,
        unit_cost: supplierMatch ? String(Number(supplierMatch.unit_price ?? 0)) : p.unit_cost,
        unit: supplierMatch?.unit || p.unit,
      }));
    }
    setItemErrors((p) => ({ ...p, item_name: undefined }));
  }

  function addItem() {
    const er = {};
    if (!item.item_name.trim()) er.item_name = "Item name required.";
    if (item.quantity === "" || Number(item.quantity) <= 0) er.quantity = "Enter a valid quantity.";
    if (item.unit_cost === "" || Number(item.unit_cost) <= 0) er.unit_cost = "Enter the unit cost.";
    if (!item.unit) er.unit = "Select a unit.";

    if (Object.keys(er).length) { setItemErrors(er); return; }

    setItems((prev) => [
      ...prev,
      {
        item_name: item.item_name.trim(),
        unit: item.unit,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
      },
    ]);
    setItem(emptyItem);
    setItemErrors({});
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

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

  function handleMapPick(lat, lng, displayName) {
    setCoords({ lat, lng });
    setTopErrors((p) => ({ ...p, location: undefined }));
    if (displayName) { setLocation(displayName); return; }
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((r) => r.json())
      .then((d) => setLocation(d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`))
      .catch(() => setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`));
  }

  function handleClear() {
    setDate(today());
    setLocation("");
    setCoords(null);
    setSpecialNote("");
    setItem(emptyItem);
    setItems([]);
    setItemErrors({});
    setTopErrors({});
    setServerError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (items.length === 0) er.items = "Add at least one item.";
    if (!location.trim()) er.location = "Location is required.";

    if (Object.keys(er).length) { setTopErrors(er); return; }

    setSaving(true); setServerError(null);

    const bestMatch = orderSupplierCandidates[0];

    const payload = {
      procurement_no: prNo,
      date,
      delivery_location: location.trim(),
      coords,
      special_note: specialNote.trim(),
      items,                 // [{item_name, unit, quantity, unit_cost}]
      total_cost: totalCost, // backend එකෙනුත් re-compute වෙනවා
      // ✅ Best-match supplier (computed above from items_supplied coverage)
      // — previously never sent, so the list page's SUPPLIER column was
      // always blank for multi-item orders.
      selected_supplier_name: bestMatch?.name ?? null,
      // ✅ Auto-computed instead of manually typed — order date + the best
      // supplier's own delivery lead time (days).
      arrival_date: bestMatch ? addDays(date, bestMatch.lead_time_days) : null,
      // ✅ Freeze the ranked supplier list at save time so the View dialog
      // can show it later without re-running the match live.
      recommended_suppliers: orderSupplierCandidates.map((s) => ({
        id: s.id,
        name: s.name,
        matchedCount: s.matchedCount,
        matchedItems: s.matchedItems,
        missing: s.missing,
        distanceKm: s.distanceKm,
        totalPrice: s.totalPrice,
        delivery_location: s.delivery_location,
      })),
      status: initialData.status ?? "pending",
    };

    try {
      if (isEdit) await procurementApi.update(procurementId, payload);
      else await procurementApi.create(payload);
      // Snapshot the ranked supplier list at save time — best match first,
      // then next-nearest — so the merchant can see who to actually order
      // from before leaving this page.
      setSavedSuppliers(orderSupplierCandidates);
      setSaved(true);
    } catch (err) {
      setServerError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n) => (Number(n) || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ✅ Post-save screen — instead of redirecting straight away, show the
  // ranked supplier list (best match first, then next-nearest) so the
  // merchant knows who to actually contact before leaving this page.
  if (saved) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card-elevated space-y-1 text-center">
          <div className="text-3xl">✅</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Procurement Saved</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {prNo} · {items.length} item{items.length > 1 ? "s" : ""} · LKR {fmt(totalCost)}
          </p>
          {savedSuppliers[0] && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Expected arrival: {addDays(date, savedSuppliers[0].lead_time_days)} (based on {savedSuppliers[0].name}'s {savedSuppliers[0].lead_time_days ?? 0}-day lead time)
            </p>
          )}
        </div>

        <div className="card-elevated space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recommended Suppliers</h2>
          <p className="text-sm text-slate-400">Best match first, then the next-nearest suppliers for this order.</p>

          {savedSuppliers.length === 0 ? (
            <p className="text-sm text-slate-400">No known supplier carries any of these items yet.</p>
          ) : (
            <div className="space-y-3">
              {savedSuppliers.map((s, i) => (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                      #{i + 1} {s.name}
                      {i === 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                          Best match
                        </span>
                      )}
                      {s.id === cheapestSupplierId && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          💰 Cheapest
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-slate-500">
                      {s.matchedCount}/{items.length} items
                      {s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km away` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Items they carry:</span> {s.matchedItems.join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    LKR {s.totalPrice.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                    {!s.fullMatch ? " (for items they carry)" : ""}
                  </p>
                  {s.missing.length > 0 && (
                    <p className="mt-1 text-xs text-slate-400">Missing: {s.missing.join(", ")}</p>
                  )}
                  {s.delivery_location && (
                    <p className="mt-1 text-xs text-slate-400">📍 {s.delivery_location}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3">
          <Button type="button" onClick={() => router.push("/dashboard/procurement")}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-5xl space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
      )}

      {/* Header */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">New Procurement</h1>
        <div className="flex items-end gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-500">Date:</label>
            <input className="input-field w-40" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Item Details */}
      <div className="card-elevated space-y-5">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Item Details</h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Item entry */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-blue-50 px-5 py-4 text-base font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">Item Information</div>
            <div className="space-y-4 p-5">
              <FormField label="Item Name" error={itemErrors.item_name} required>
                <select
                  className={itemErrors.item_name ? "select-field border-red-400 ring-2 ring-red-100" : "select-field"}
                  value={item.item_name}
                  onChange={(e) => pickItemName(e.target.value)}
                >
                  <option value="">Select item</option>
                  {itemNameOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </FormField>

              {/* ✅ Which suppliers carry this item — ranked by a combined
                  score of price (incl. their delivery fee), distance to the
                  delivery point, and their stated delivery lead time. */}
              {item.item_name && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
                  {matchingSuppliers.length === 0 ? (
                    <>No known supplier for "{item.item_name}" yet.</>
                  ) : (
                    <>
                      <div className="mb-1.5 font-semibold">Suppliers for {item.item_name}:</div>
                      <ul className="space-y-1.5">
                        {scoredSuppliers.map((s) => (
                          <li key={s.id} className="border-b border-blue-100/60 pb-1.5 last:border-0 last:pb-0 dark:border-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex flex-wrap items-center gap-1">
                                {s.name}
                                {s.id === bestOverallId && (
                                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                                    🏆 Best overall
                                  </span>
                                )}
                                {s.id === nearestSupplierId && (
                                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    📍 Nearest
                                  </span>
                                )}
                                {s.id === cheapestSingleId && (
                                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                    💰 Cheapest
                                  </span>
                                )}
                                {s.id === fastestSingleId && (
                                  <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                    🚚 Fastest
                                  </span>
                                )}
                              </span>
                            </div>
                            <p className="mt-0.5 text-slate-500">
                              LKR {s.estimatedCost.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                              {" · "}{s.leadTimeDays}-day delivery
                              {s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ""}
                            </p>
                          </li>
                        ))}
                        {matchingSuppliers.length > mappableSuppliers.length && (
                          <li className="pt-1 text-slate-400">
                            + {matchingSuppliers.length - mappableSuppliers.length} more without a saved map location
                          </li>
                        )}
                      </ul>
                      {!coords && (
                        <p className="mt-1.5 text-[11px] text-slate-400">Pick a delivery location below to factor in distance too.</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <FormField label="Quantity" error={itemErrors.quantity} required>
                <input className={itemErrors.quantity ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                  type="number" min="0" step="0.01" value={item.quantity}
                  onChange={(e) => setItemField("quantity", e.target.value)} placeholder="Enter quantity" />
              </FormField>

              {/* NEW: Unit Cost per item */}
              <FormField label="Unit Cost (LKR)" error={itemErrors.unit_cost} required hint="Buying price per unit (goes to the batch cost)">
                <input className={itemErrors.unit_cost ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                  type="number" min="0" step="0.01" value={item.unit_cost}
                  onChange={(e) => setItemField("unit_cost", e.target.value)} placeholder="0.00" />
              </FormField>

              <FormField label="Unit" error={itemErrors.unit} required>
                <select className={itemErrors.unit ? "select-field border-red-400 ring-2 ring-red-100" : "select-field"}
                  value={item.unit} onChange={(e) => setItemField("unit", e.target.value)}>
                  <option value="">Select unit</option>
                  {INVENTORY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </FormField>

              <Button type="button" variant="secondary" onClick={addItem}>+ Add Item</Button>
            </div>
          </div>

          {/* Added items */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-blue-50 px-5 py-4 text-base font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">Added items</div>
            <div className="p-5">
              {topErrors.items && <p className="mb-3 text-sm text-red-600">{topErrors.items}</p>}

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <th className="px-3 py-3 text-left font-semibold">#</th>
                      <th className="px-3 py-3 text-left font-semibold">Item</th>
                      <th className="px-3 py-3 text-right font-semibold">Qty</th>
                      <th className="px-3 py-3 text-right font-semibold">Unit Cost</th>
                      <th className="px-3 py-3 text-right font-semibold">Line Total</th>
                      <th className="px-3 py-3 text-center font-semibold">✕</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No items added yet.</td></tr>
                    ) : (
                      items.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-100">{it.item_name}<span className="ml-1 text-xs text-slate-400">({it.unit})</span></td>
                          <td className="px-3 py-3 text-right">{it.quantity}</td>
                          <td className="px-3 py-3 text-right">{fmt(it.unit_cost)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{fmt((Number(it.quantity) || 0) * (Number(it.unit_cost) || 0))}</td>
                          <td className="px-3 py-3 text-center">
                            <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700" aria-label="Remove">✕</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-1 text-sm font-bold text-blue-700 dark:text-blue-300">
                <div className="flex items-center justify-between"><span>Total Items: {totalItems}</span><span>Total Quantity: {totalQuantity}</span></div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                  <span>Total Cost</span><span>LKR {fmt(totalCost)}</span>
                </div>
              </div>

              {/* ✅ Best supplier(s) for the whole basket — coverage-ranked,
                  nearest as tiebreaker once a delivery point is picked. */}
              {items.length > 0 && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-normal text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
                  <div className="mb-1.5 font-semibold">
                    Best supplier for this order ({items.length} item{items.length > 1 ? "s" : ""}):
                  </div>
                  {orderSupplierCandidates.length === 0 ? (
                    <>No known supplier carries any of these items yet.</>
                  ) : (
                    <ul className="space-y-1.5">
                      {orderSupplierCandidates.slice(0, 5).map((s) => (
                        <li key={s.id} className="border-b border-blue-100/60 pb-1.5 last:border-0 last:pb-0 dark:border-slate-700">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-medium">
                              {s.name}
                              {s.id === bestOrderSupplierId && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                                  Best match
                                </span>
                              )}
                              {s.id === cheapestSupplierId && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                  💰 Cheapest
                                </span>
                              )}
                            </span>
                            <span>
                              {s.matchedCount}/{orderItemNames.length} items
                              {s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ""}
                            </span>
                          </div>
                          <p className="mt-0.5 text-slate-500">
                            LKR {s.totalPrice.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                            {!s.fullMatch ? " (for items they carry)" : ""}
                          </p>
                          {s.missing.length > 0 && (
                            <p className="mt-0.5 text-[11px] text-slate-400">Missing: {s.missing.join(", ")}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!coords && orderSupplierCandidates.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-slate-400">Pick a delivery location below to rank by distance too.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location + map */}
      <div className="card-elevated space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField label="Location" error={topErrors.location} required>
              <input className={topErrors.location ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"}
                value={location}
                onChange={(e) => { setLocation(e.target.value); setTopErrors((p) => ({ ...p, location: undefined })); }}
                placeholder="e.g. SLIIT, New Kandy Rd, Malabe" />
            </FormField>
          </div>
          <Button type="button" onClick={handleLocate}>📍 Use My Location</Button>
        </div>
        <p className="text-xs text-slate-400">Tip: You can click on the map and pick the exact location</p>
        {supplierMapMarkers.length > 0 && (
          <p className="text-xs text-slate-400">
            {orderItemNames.length > 0
              ? <>🟢 Best match &nbsp; 🟡 Cheapest &nbsp; 🔴 Other suppliers &nbsp; 🔵 Delivery location</>
              : <>🟢 Best overall for "{item.item_name}" &nbsp; 🟡 Cheapest &nbsp; 🔴 Other suppliers &nbsp; 🔵 Delivery location</>}
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <LocationPickerMap coords={coords} onPick={handleMapPick} extraMarkers={supplierMapMarkers} />
        </div>
      </div>

      {/* Note */}
      <div className="card-elevated">
        <FormField label="Special Note">
          <textarea className="input-field min-h-[110px] resize-y" value={specialNote}
            onChange={(e) => setSpecialNote(e.target.value)} placeholder="Enter special note here..." />
        </FormField>
      </div>

      {/* Footer */}
      <div className="flex justify-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update" : "Save")}</Button>
        <Button type="button" variant="secondary" onClick={handleClear}>Clear</Button>
        <Link href="/dashboard/procurement"><Button type="button" variant="secondary">Cancel</Button></Link>
      </div>
    </form>
  );
}