"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Navigation, Truck, Clock, Package } from "lucide-react";

import { t } from "@/lib/i18n";
import { MAPS_LOADER, MARKER_ICONS, fetchRoute, formatDuration } from "@/lib/maps";
import { distanceKm, formatLkr } from "@/lib/procurement";

const DEFAULT_CENTER = { lat: 6.9147, lng: 79.9727 }; // Malabe default
const ORIGIN_KEY = "lankalink.shopLocation"; // remembered per browser for convenience

function loadOrigin() {
  try {
    const v = JSON.parse(localStorage.getItem(ORIGIN_KEY));
    return v && typeof v.lat === "number" && typeof v.lng === "number" ? v : null;
  } catch {
    return null;
  }
}

function saveOrigin(origin) {
  try {
    localStorage.setItem(ORIGIN_KEY, JSON.stringify(origin));
  } catch {}
}

// Suppliers on a map: how far each one is from the shop, the road route to the selected one,
// and what it costs / how long it takes them to deliver.
export default function SupplierMap({ suppliers = [] }) {
  const { isLoaded, loadError } = useJsApiLoader(MAPS_LOADER);
  const mapRef = useRef(null);

  const [origin, setOrigin] = useState(null);
  const [locating, setLocating] = useState(false);
  const [originError, setOriginError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);

  useEffect(() => setOrigin(loadOrigin()), []);

  function setShop(point) {
    setOrigin(point);
    saveOrigin(point);
    setOriginError(null);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setOriginError(t("Geolocation isn't supported on this browser."));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setShop(point);
        mapRef.current?.panTo(point);
      },
      () => {
        setLocating(false);
        setOriginError(t("Couldn't get your location. Try picking it on the map instead."));
      },
    );
  }

  // suppliers with a map pin, nearest first once the shop location is known
  const located = useMemo(() => {
    const list = suppliers
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        ...s,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        itemCount: Array.isArray(s.items_supplied) ? s.items_supplied.length : 0,
      }))
      .map((s) => ({ ...s, straightKm: origin ? distanceKm(origin.lat, origin.lng, s.lat, s.lng) : null }));
    return origin ? list.sort((a, b) => a.straightKm - b.straightKm) : list;
  }, [suppliers, origin]);
  const unlocated = suppliers.filter((s) => s.latitude == null || s.longitude == null);
  const nearestId = origin ? located[0]?.id : null;
  const selected = located.find((s) => s.id === selectedId) || null;

  // road route from the shop to the selected supplier
  useEffect(() => {
    if (!isLoaded || !origin || !selected) {
      setRoute(null);
      setRouteError(null);
      return;
    }
    let cancelled = false;
    setRoute(null);
    fetchRoute(origin, { lat: selected.lat, lng: selected.lng })
      .then((r) => {
        if (cancelled) return;
        setRoute(r);
        setRouteError(r ? null : t("No route found"));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Route failed:", err.message);
        setRouteError(t("No route found"));
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, origin, selected]);

  // keep both ends of the route in view
  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (origin && selected) {
      const b = new google.maps.LatLngBounds();
      b.extend(origin);
      b.extend({ lat: selected.lat, lng: selected.lng });
      mapRef.current.fitBounds(b, 60);
    } else if (selected) {
      mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
    }
  }, [origin, selected]);

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      // first view: every supplier (and the shop) on screen
      const points = [...located.map((s) => ({ lat: s.lat, lng: s.lng })), ...(origin ? [origin] : [])];
      if (points.length > 1) {
        const b = new google.maps.LatLngBounds();
        points.forEach((p) => b.extend(p));
        map.fitBounds(b, 60);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (loadError) {
    return (
      <div className="card text-sm text-red-500">{t("Couldn't load Google Maps. Check the API key.")}</div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ---- Map ---- */}
      <div className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {origin
              ? t("Your shop location is set — click the map to change it.")
              : t("Set your shop location: use your location or click the map.")}
          </p>
          <button type="button" onClick={locateMe} disabled={locating} className="btn-secondary !py-2">
            <Navigation className="h-4 w-4" /> {locating ? t("Locating…") : t("📍 Use My Location")}
          </button>
        </div>
        {originError && <p className="px-1 text-xs text-red-500">{originError}</p>}

        {!isLoaded ? (
          <div className="flex h-[520px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400 dark:bg-slate-800/40">
            {t("Loading map…")}
          </div>
        ) : (
          <div className="relative">
            {selected && (route || routeError) && (
              <div className="absolute left-3 top-3 z-10 rounded-xl bg-white/95 px-3 py-2 text-xs font-medium shadow-card dark:bg-slate-900/95">
                {route ? (
                  <span className="text-brand-700 dark:text-brand-400">
                    🚗 {route.km} km · ⏱ {formatDuration(route.mins)}
                  </span>
                ) : (
                  <span className="text-slate-500">{routeError}</span>
                )}
              </div>
            )}
            <GoogleMap
              center={origin || (located[0] ? { lat: located[0].lat, lng: located[0].lng } : DEFAULT_CENTER)}
              zoom={12}
              mapContainerClassName="h-[520px] w-full rounded-xl"
              onLoad={onMapLoad}
              onClick={(e) => setShop({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              {origin && <Marker position={origin} icon={MARKER_ICONS.main} title={t("Your shop")} />}
              {located.map((s) => (
                <Marker
                  key={s.id}
                  position={{ lat: s.lat, lng: s.lng }}
                  icon={s.id === nearestId ? MARKER_ICONS.nearest : MARKER_ICONS.supplier}
                  title={s.name}
                  onClick={() => setSelectedId(s.id)}
                />
              ))}
              {route && (
                <Polyline
                  path={route.path}
                  options={{ strokeColor: "#2a5bdb", strokeWeight: 5, strokeOpacity: 0.85 }}
                />
              )}
            </GoogleMap>
          </div>
        )}
        <p className="px-1 text-xs text-slate-400">
          🔵 {t("Your shop")} · 🟢 {t("Nearest supplier")} · 🔴 {t("Other suppliers")}
        </p>
      </div>

      {/* ---- Supplier list, nearest first ---- */}
      <div className="card max-h-[640px] space-y-2 overflow-y-auto p-3">
        <h3 className="px-1 font-display text-base font-semibold text-slate-800 dark:text-slate-100">
          {origin ? t("Suppliers by distance") : t("Suppliers on the map")}
        </h3>
        {located.length === 0 && (
          <p className="px-1 text-sm text-slate-400">{t("No supplier has a map location yet.")}</p>
        )}
        {located.map((s) => {
          const isSel = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(isSel ? null : s.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                isSel
                  ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950"
                  : "border-slate-100 hover:border-brand-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                {s.id === nearestId && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {t("📍 Nearest")}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {s.straightKm != null && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />≈ {s.straightKm.toFixed(1)} km
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3 w-3" /> LKR {formatLkr(s.delivery_cost)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {Number(s.lead_time_days) || 0}
                  {t("-day delivery")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3 w-3" /> {s.itemCount} {t("items")}
                </span>
              </div>
              {isSel && (
                <div className="mt-2 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                  {!origin ? (
                    <span className="text-slate-500">
                      {t("Set your shop location to see the road route.")}
                    </span>
                  ) : route ? (
                    <span className="font-semibold text-brand-700 dark:text-brand-400">
                      🚗 {route.km} km {t("by road")} · ⏱ {formatDuration(route.mins)}
                    </span>
                  ) : routeError ? (
                    <span className="text-slate-500">{routeError}</span>
                  ) : (
                    <span className="text-slate-400">{t("Calculating...")}</span>
                  )}
                  {s.delivery_location && <p className="mt-1 text-slate-500">{s.delivery_location}</p>}
                </div>
              )}
            </button>
          );
        })}
        {unlocated.length > 0 && (
          <p className="px-1 pt-2 text-xs text-slate-400">
            {unlocated.length} {t("more without a saved map location")}:{" "}
            {unlocated.map((s) => s.name).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
