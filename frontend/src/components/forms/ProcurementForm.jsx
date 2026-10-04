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
import { parseCoordText, reverseGeocode } from "@/lib/geo";
import { today, genPrNo, distanceKm, addDays, emptyItem, formatLkr as fmt } from "@/lib/procurement";
import ProcurementSavedSummary from "@/components/procurement/ProcurementSavedSummary";
import ItemSupplierList from "@/components/procurement/ItemSupplierList";
import OrderSupplierList from "@/components/procurement/OrderSupplierList";

import { t } from "@/lib/i18n";
const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), { ssr: false });

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
    inventoryApi
      .list()
      .then((d) => setInventory(Array.isArray(d) ? d : []))
      .catch(() => setInventory([]));
  }, []);

  useEffect(() => {
    supplierApi
      .list()
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => setSuppliers([]));
  }, []);

  // editing an older order whose location was saved as "lat, lng": show the address instead
  useEffect(() => {
    const point = parseCoordText(location);
    if (!point) return;
    setCoords((c) => c ?? point);
    reverseGeocode(point.lat, point.lng).then((address) => address && setLocation(address));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inventoryItemNames = inventory.map((i) => i.name).filter(Boolean);

  // Also pull in every item name suppliers have listed under items_supplied
  // — a merchant should be able to procure something a supplier carries even
  // before it exists as an Inventory record.
  const supplierItemNamesFlat = suppliers.flatMap((s) =>
    Array.isArray(s.items_supplied) ? s.items_supplied.map((it) => it.item_name).filter(Boolean) : [],
  );

  const itemNames = [...new Set([...inventoryItemNames, ...supplierItemNamesFlat])];
  const itemNameOptions = [...itemNames];
  if (item.item_name && !itemNameOptions.includes(item.item_name)) {
    itemNameOptions.unshift(item.item_name);
  }

  // Suppliers that supply the item currently selected in the entry form —
  // matched against each supplier's items_supplied list. Only suppliers with
  // a saved map pin (latitude/longitude) can be shown on the map, so those
  // without one are left out of the "on map" set but still worth knowing
  // about — kept separate so we can mention them without pinning them.
  const matchingSuppliers = suppliers.filter(
    (s) =>
      Array.isArray(s.items_supplied) &&
      s.items_supplied.some(
        (it) => it.item_name?.trim().toLowerCase() === item.item_name.trim().toLowerCase(),
      ),
  );

  // Enrich each matching supplier with everything needed to compare them
  // properly: item price (+ their flat delivery fee) as "estimated cost",
  // distance to the chosen delivery point, and their stated delivery lead
  // time — instead of just picking by distance alone.
  const enrichedSuppliers = matchingSuppliers.map((s) => {
    const supplierItem = s.items_supplied.find(
      (it) => it.item_name?.trim().toLowerCase() === item.item_name.trim().toLowerCase(),
    );
    const unitPrice = Number(supplierItem?.unit_price) || 0;
    const qty = Number(item.quantity) || 1;
    const estimatedCost = unitPrice * qty + (Number(s.delivery_cost) || 0);
    const leadTimeDays = Number(s.lead_time_days) || 0;
    const dKm =
      coords && s.latitude != null && s.longitude != null
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
      score:
        costNorm(s.estimatedCost) +
        leadNorm(s.leadTimeDays) +
        (s.distanceKm != null ? distNorm(s.distanceKm) : 0),
    }))
    .sort((a, b) => a.score - b.score);

  const suppliersWithDistance = scoredSuppliers; // kept name for the map-marker code below
  const bestOverallId = scoredSuppliers[0]?.id;
  const nearestSupplierId =
    coords && mappableSuppliers.length
      ? [...mappableSuppliers].sort((a, b) => a.distanceKm - b.distanceKm)[0].id
      : null;
  const cheapestSingleId = enrichedSuppliers.length
    ? [...enrichedSuppliers].sort((a, b) => a.estimatedCost - b.estimatedCost)[0].id
    : null;
  const fastestSingleId = enrichedSuppliers.length
    ? [...enrichedSuppliers].sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0].id
    : null;

  // Whole-order matching — once items have been added, find which
  // supplier(s) can fulfil the most of the basket (not just the single item
  // currently being typed into the entry form). Ranked by how many of the
  // added items they carry, then by distance to the delivery point.
  const orderItemNames = items.map((it) => it.item_name.trim().toLowerCase());

  const orderSupplierCandidates =
    orderItemNames.length === 0
      ? []
      : suppliers
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
            // What it would cost to buy the items this supplier carries, using
            // their own per-item unit_price — powers the "Cheapest" comparison.
            const totalPrice = items.reduce((sum, it) => {
              const match = supplierItems.find(
                (si) => si.item_name?.trim().toLowerCase() === it.item_name.trim().toLowerCase(),
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
              distanceKm:
                coords && s.latitude != null && s.longitude != null
                  ? distanceKm(coords.lat, coords.lng, Number(s.latitude), Number(s.longitude))
                  : null,
            };
          })
          .filter((s) => s.matchedCount > 0)
          .sort(
            (a, b) =>
              b.matchedCount - a.matchedCount || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
          );

  const bestOrderSupplierId = orderSupplierCandidates[0]?.id;

  // Cheapest of the matching suppliers, by total price for the items
  // they carry (not necessarily a full-match supplier — coverage is shown
  // alongside so the comparison stays honest).
  const cheapestSupplierId =
    orderSupplierCandidates.length > 0
      ? orderSupplierCandidates.reduce(
          (min, s) => (s.totalPrice < min.totalPrice ? s : min),
          orderSupplierCandidates[0],
        ).id
      : null;

  // Map markers: once the order has items, show whole-order coverage
  // (best-match = green, cheapest = gold) instead of the single-item view.
  const supplierMapMarkers =
    orderItemNames.length > 0
      ? orderSupplierCandidates
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s) => ({
            lat: Number(s.latitude),
            lng: Number(s.longitude),
            label:
              `${s.name} — ${s.matchedCount}/${orderItemNames.length} items` +
              (s.fullMatch ? " ✓ full match" : "") +
              ` — LKR ${s.totalPrice.toLocaleString("en-LK", { minimumFractionDigits: 2 })}` +
              (s.id === cheapestSupplierId ? " (cheapest)" : "") +
              (s.distanceKm != null ? ` — ${s.distanceKm.toFixed(1)} km` : ""),
            highlight: s.id === bestOrderSupplierId,
            cheapest: s.id === cheapestSupplierId,
          }))
      : suppliersWithDistance
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s) => ({
            lat: Number(s.latitude),
            lng: Number(s.longitude),
            label:
              `${s.name}` +
              ` — LKR ${s.estimatedCost.toLocaleString("en-LK", { minimumFractionDigits: 2 })}` +
              ` · ${s.leadTimeDays}d lead time` +
              (s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ""),
            highlight: s.id === bestOverallId,
            cheapest: s.id === cheapestSingleId && s.id !== bestOverallId,
          }));

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  // Grand total cost = sum of qty × unit_cost over all items
  const totalCost = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0),
    0,
  );

  function setItemField(k, val) {
    setItem((p) => ({ ...p, [k]: val }));
    setItemErrors((p) => ({ ...p, [k]: undefined }));
  }

  // Picking an item pre-fills its inventory cost; an item only listed by suppliers is pre-filled
  // from their unit_price / unit (editable).
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
    if (!item.item_name.trim()) er.item_name = t("Item name required.");
    if (item.quantity === "" || Number(item.quantity) <= 0) er.quantity = t("Enter a valid quantity.");
    if (item.unit_cost === "" || Number(item.unit_cost) <= 0) er.unit_cost = t("Enter the unit cost.");
    if (!item.unit) er.unit = t("Select a unit.");

    if (Object.keys(er).length) {
      setItemErrors(er);
      return;
    }

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
        // look up the address (never save raw "lat, lng" as the delivery location)
        handleMapPick(latitude, longitude);
      },
      () => {},
      { enableHighAccuracy: true },
    );
  }

  function handleMapPick(lat, lng, displayName) {
    setCoords({ lat, lng });
    setTopErrors((p) => ({ ...p, location: undefined }));
    if (displayName) {
      setLocation(displayName);
      return;
    }
    // no address found → leave the field for the user to type (the pin is still saved in coords)
    reverseGeocode(lat, lng).then((address) => address && setLocation(address));
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
    if (items.length === 0) er.items = t("Add at least one item.");
    if (!location.trim()) er.location = t("Location is required.");

    if (Object.keys(er).length) {
      setTopErrors(er);
      return;
    }

    setSaving(true);
    setServerError(null);

    const bestMatch = orderSupplierCandidates[0];

    const payload = {
      procurement_no: prNo,
      date,
      delivery_location: location.trim(),
      coords,
      special_note: specialNote.trim(),
      items, // [{item_name, unit, quantity, unit_cost}]
      total_cost: totalCost, // recomputed by the backend too
      // Best-match supplier (computed above from items_supplied coverage)
      // — previously never sent, so the list page's SUPPLIER column was
      // always blank for multi-item orders.
      selected_supplier_name: bestMatch?.name ?? null,
      // Auto-computed instead of manually typed — order date + the best
      // supplier's own delivery lead time (days).
      arrival_date: bestMatch ? addDays(date, bestMatch.lead_time_days) : null,
      // Freeze the ranked supplier list at save time so the View dialog
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
      setServerError(err.message || t("Save failed."));
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <ProcurementSavedSummary
        prNo={prNo}
        items={items}
        totalCost={totalCost}
        date={date}
        savedSuppliers={savedSuppliers}
        cheapestSupplierId={cheapestSupplierId}
        onContinue={() => router.push("/dashboard/procurement")}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-5xl space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">{t("New Procurement")}</h1>
        <div className="flex items-end gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-500">{t("Date:")}</label>
            <input
              className="input-field w-40"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Item Details */}
      <div className="card-elevated space-y-5">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t("Item Details")}</h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Item entry */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-blue-50 px-5 py-4 text-base font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
              {t("Item Information")}
            </div>
            <div className="space-y-4 p-5">
              <FormField label={t("Item Name")} error={itemErrors.item_name} required>
                <select
                  className={
                    itemErrors.item_name ? "select-field border-red-400 ring-2 ring-red-100" : "select-field"
                  }
                  value={item.item_name}
                  onChange={(e) => pickItemName(e.target.value)}
                >
                  <option value="">{t("Select item")}</option>
                  {itemNameOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </FormField>

              {item.item_name && (
                <ItemSupplierList
                  itemName={item.item_name}
                  matchingSuppliers={matchingSuppliers}
                  scoredSuppliers={scoredSuppliers}
                  mappableSuppliers={mappableSuppliers}
                  bestOverallId={bestOverallId}
                  nearestSupplierId={nearestSupplierId}
                  cheapestSingleId={cheapestSingleId}
                  fastestSingleId={fastestSingleId}
                  hasCoords={!!coords}
                />
              )}

              <FormField label={t("Quantity")} error={itemErrors.quantity} required>
                <input
                  className={
                    itemErrors.quantity ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => setItemField("quantity", e.target.value)}
                  placeholder={t("Enter quantity")}
                />
              </FormField>

              {/* NEW: Unit Cost per item */}
              <FormField
                label={t("Unit Cost (LKR)")}
                error={itemErrors.unit_cost}
                required
                hint={t("Buying price per unit (goes to the batch cost)")}
              >
                <input
                  className={
                    itemErrors.unit_cost ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_cost}
                  onChange={(e) => setItemField("unit_cost", e.target.value)}
                  placeholder="0.00"
                />
              </FormField>

              <FormField label={t("Unit")} error={itemErrors.unit} required>
                <select
                  className={
                    itemErrors.unit ? "select-field border-red-400 ring-2 ring-red-100" : "select-field"
                  }
                  value={item.unit}
                  onChange={(e) => setItemField("unit", e.target.value)}
                >
                  <option value="">{t("Select unit")}</option>
                  {INVENTORY_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <Button type="button" variant="secondary" onClick={addItem}>
                {t("+ Add Item")}
              </Button>
            </div>
          </div>

          {/* Added items */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-blue-50 px-5 py-4 text-base font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
              {t("Added items")}
            </div>
            <div className="p-5">
              {topErrors.items && <p className="mb-3 text-sm text-red-600">{topErrors.items}</p>}

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <th className="px-3 py-3 text-left font-semibold">#</th>
                      <th className="px-3 py-3 text-left font-semibold">{t("Item")}</th>
                      <th className="px-3 py-3 text-right font-semibold">{t("Qty")}</th>
                      <th className="px-3 py-3 text-right font-semibold">{t("Unit Cost")}</th>
                      <th className="px-3 py-3 text-right font-semibold">{t("Line Total")}</th>
                      <th className="px-3 py-3 text-center font-semibold">✕</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          {t("No items added yet.")}
                        </td>
                      </tr>
                    ) : (
                      items.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-100">
                            {it.item_name}
                            <span className="ml-1 text-xs text-slate-400">({it.unit})</span>
                          </td>
                          <td className="px-3 py-3 text-right">{it.quantity}</td>
                          <td className="px-3 py-3 text-right">{fmt(it.unit_cost)}</td>
                          <td className="px-3 py-3 text-right font-semibold">
                            {fmt((Number(it.quantity) || 0) * (Number(it.unit_cost) || 0))}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="text-red-500 hover:text-red-700"
                              aria-label={t("Remove")}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-1 text-sm font-bold text-blue-700 dark:text-blue-300">
                <div className="flex items-center justify-between">
                  <span>
                    {t("Total Items:")} {totalItems}
                  </span>
                  <span>
                    {t("Total Quantity:")} {totalQuantity}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                  <span>{t("Total Cost")}</span>
                  <span>LKR {fmt(totalCost)}</span>
                </div>
              </div>

              {items.length > 0 && (
                <OrderSupplierList
                  items={items}
                  orderSupplierCandidates={orderSupplierCandidates}
                  orderItemNames={orderItemNames}
                  bestOrderSupplierId={bestOrderSupplierId}
                  cheapestSupplierId={cheapestSupplierId}
                  hasCoords={!!coords}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location + map */}
      <div className="card-elevated space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField label={t("Location")} error={topErrors.location} required>
              <input
                className={
                  topErrors.location ? "input-field border-red-400 ring-2 ring-red-100" : "input-field"
                }
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setTopErrors((p) => ({ ...p, location: undefined }));
                }}
                placeholder={t("e.g. SLIIT, New Kandy Rd, Malabe")}
              />
            </FormField>
          </div>
          <Button type="button" onClick={handleLocate}>
            {t("📍 Use My Location")}
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          {t("Tip: You can click on the map and pick the exact location")}
        </p>
        {supplierMapMarkers.length > 0 && (
          <p className="text-xs text-slate-400">
            {orderItemNames.length > 0 ? (
              <>{t("🟢 Best match 🟡 Cheapest 🔴 Other suppliers 🔵 Delivery location")}</>
            ) : (
              <>
                {t('🟢 Best overall for "')}
                {item.item_name}
                {t('" 🟡 Cheapest 🔴 Other suppliers 🔵 Delivery location')}
              </>
            )}
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <LocationPickerMap coords={coords} onPick={handleMapPick} extraMarkers={supplierMapMarkers} />
        </div>
      </div>

      {/* Note */}
      <div className="card-elevated">
        <FormField label={t("Special Note")}>
          <textarea
            className="input-field min-h-[110px] resize-y"
            value={specialNote}
            onChange={(e) => setSpecialNote(e.target.value)}
            placeholder={t("Enter special note here...")}
          />
        </FormField>
      </div>

      {/* Footer */}
      <div className="flex justify-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("Saving...") : isEdit ? t("Update") : t("Save")}
        </Button>
        <Button type="button" variant="secondary" onClick={handleClear}>
          {t("Clear")}
        </Button>
        <Link href="/dashboard/procurement">
          <Button type="button" variant="secondary">
            {t("Cancel")}
          </Button>
        </Link>
      </div>
    </form>
  );
}
