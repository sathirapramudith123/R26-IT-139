"use client";
import { useEffect, useRef, useState, useId, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default marker icon fix (Next.js/webpack doesn't bundle Leaflet's default
// icon images correctly, so we point directly at the CDN versions instead).
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ✅ Colored variants (public "leaflet-color-markers" CDN icons) so supplier
// pins are visually distinct from the main location pin — red for a regular
// matching supplier, green for the nearest one.
const supplierIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const nearestSupplierIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const cheapestSupplierIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Invisible helper: listens for map clicks and reports lat/lng to the parent.
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// extraMarkers: optional array of { lat, lng, label, highlight }.
// Used by the Procurement form to plot suppliers of the selected item
// (highlight=true on the nearest one) — SupplierForm just doesn't pass this,
// so nothing changes there.
//
// routeTo: optional { lat, lng } — the delivery/journey destination. When
// given (or derivable from a highlighted extraMarker), an actual road route
// from `coords` to that point is fetched from the public OSRM routing API
// and drawn on the map as a line that follows real roads.
export default function LocationPickerMap({ coords, onPick, extraMarkers = [], routeTo, showRoute = true }) {
  const center = coords ? [coords.lat, coords.lng] : [6.9147, 79.9727]; // Malabe default

  // "Map container is being reused" fix:
  // React Strict Mode (dev) mounts -> unmounts -> remounts. Leaflet keeps an
  // internal _leaflet_id on the DOM node, so the 2nd mount hits the same node
  // and throws. We only render <MapContainer> AFTER the component has settled
  // on the client, and give it a unique key so each mount gets a fresh node.
  const uid = useId();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, []);

  // If no explicit routeTo was passed, fall back to the highlighted
  // (nearest) supplier marker, if there is one.
  const destination = routeTo || extraMarkers.find(m => m.highlight);

  const [routeCoords, setRouteCoords] = useState(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeError, setRouteError] = useState(null);

  useEffect(() => {
    if (!showRoute || !coords || !destination) {
      setRouteCoords(null);
      setRouteDistanceKm(null);
      setRouteError(null);
      return;
    }

    let cancelled = false;
    setRouteError(null);

    const url = `https://router.project-osrm.org/route/v1/driving/${coords.lng},${coords.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const route = data?.routes?.[0];
        if (!route) {
          setRouteError("No route found");
          setRouteCoords(null);
          return;
        }
        // GeoJSON gives [lng, lat] pairs — Leaflet wants [lat, lng].
        const latLngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRouteCoords(latLngs);
        setRouteDistanceKm((route.distance / 1000).toFixed(1));
      })
      .catch(() => {
        if (!cancelled) {
          setRouteError("Couldn't load route");
          setRouteCoords(null);
        }
      });

    return () => { cancelled = true; };
  }, [showRoute, coords?.lat, coords?.lng, destination?.lat, destination?.lng]);

  if (!ready) {
    // placeholder while the map initialises (keeps layout stable)
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative">
      {(routeDistanceKm || routeError) && (
        <div className="absolute right-3 top-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
          {routeDistanceKm ? (
            <span className="text-teal-700 dark:text-teal-400">🚗 {routeDistanceKm} km</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{routeError}</span>
          )}
        </div>
      )}
      <MapContainer
        key={uid}                    /* fresh container per mount -> no reuse */
        center={center}
        zoom={coords ? 15 : 13}
        className="h-72 w-full rounded-xl"
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClickHandler onPick={onPick} />
        {coords && <Marker position={[coords.lat, coords.lng]} icon={markerIcon} />}
        {extraMarkers.map((m, i) => (
          <Marker
            key={i}
            position={[m.lat, m.lng]}
            icon={m.highlight ? nearestSupplierIcon : m.cheapest ? cheapestSupplierIcon : supplierIcon}
          >
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
        {routeCoords && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#0d9488", weight: 4, opacity: 0.8 }}
          />
        )}
      </MapContainer>
    </div>
  );
}