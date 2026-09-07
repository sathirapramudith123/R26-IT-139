"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  Autocomplete,
  useJsApiLoader,
} from "@react-google-maps/api";

const LIBRARIES = ["places"];

const DEFAULT_CENTER = { lat: 6.9147, lng: 79.9727 }; // Malabe default

const MARKER_COLORS = {
  main: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  supplier: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  nearest: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  cheapest: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
};

function formatDuration(mins) {
  if (mins == null) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// extraMarkers: optional array of { lat, lng, label, highlight, cheapest }.
// Used by the Procurement form to plot suppliers of the selected item
// (highlight=true on the nearest one) — SupplierForm just doesn't pass this,
// so nothing changes there.
//
// routeTo: optional { lat, lng } — the delivery/journey destination. When
// given (or derivable from a highlighted extraMarker), an actual road route
// from `coords` to that point is fetched via the Google Directions API and
// drawn on the map.
export default function LocationPickerMap({ coords, onPick, extraMarkers = [], routeTo, showRoute = true }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const center = coords || DEFAULT_CENTER;

  const destination = routeTo || extraMarkers.find(m => m.highlight);

  const [directions, setDirections] = useState(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeDurationMin, setRouteDurationMin] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [requestRoute, setRequestRoute] = useState(false);

  // Map instance + Places Autocomplete (search box).
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return; // user pressed enter without picking a suggestion

    const lat = loc.lat();
    const lng = loc.lng();
    onPick(lat, lng);

    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(16);
    }
  }, [onPick]);

  // Re-trigger a DirectionsService request whenever the origin/destination
  // pair changes (or clear the route if either side is missing).
  useEffect(() => {
    if (!showRoute || !coords || !destination) {
      setDirections(null);
      setRouteDistanceKm(null);
      setRouteDurationMin(null);
      setRouteError(null);
      setRequestRoute(false);
      return;
    }
    setRequestRoute(true);
  }, [showRoute, coords?.lat, coords?.lng, destination?.lat, destination?.lng]);

  const directionsCallback = useCallback((result, status) => {
    setRequestRoute(false); // only fire the request once per change
    if (status === "OK" && result) {
      setDirections(result);
      const leg = result.routes?.[0]?.legs?.[0];
      if (leg) {
        setRouteDistanceKm((leg.distance.value / 1000).toFixed(1));
        setRouteDurationMin(Math.round(leg.duration.value / 60));
      }
      setRouteError(null);
    } else {
      setDirections(null);
      setRouteError("No route found");
    }
  }, []);

  const onMapClick = useCallback((e) => {
    onPick(e.latLng.lat(), e.latLng.lng());
  }, [onPick]);

  if (loadError) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-500 dark:border-red-900 dark:bg-red-950/40">
        Couldn't load Google Maps. Check the API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search box — type a place/address, pick a suggestion to jump there */}
      <div className="absolute left-3 top-3 z-10 w-[calc(100%-5.5rem)] max-w-sm sm:w-72">
        <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
          <input
            type="text"
            placeholder="Search a place or address…"
            className="w-full rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
          />
        </Autocomplete>
      </div>

      {(routeDistanceKm || routeError) && (
        <div className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
          {routeDistanceKm ? (
            <span className="text-teal-700 dark:text-teal-400">
              🚗 {routeDistanceKm} km · ⏱ {formatDuration(routeDurationMin)}
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{routeError}</span>
          )}
        </div>
      )}

      <GoogleMap
        center={center}
        zoom={coords ? 15 : 13}
        mapContainerClassName="h-72 w-full rounded-xl"
        onClick={onMapClick}
        onLoad={onMapLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {coords && <Marker position={coords} icon={MARKER_COLORS.main} />}

        {extraMarkers.map((m, i) => (
          <Marker
            key={i}
            position={{ lat: m.lat, lng: m.lng }}
            icon={m.highlight ? MARKER_COLORS.nearest : m.cheapest ? MARKER_COLORS.cheapest : MARKER_COLORS.supplier}
            title={m.label}
          />
        ))}

        {requestRoute && coords && destination && (
          <DirectionsService
            options={{
              origin: coords,
              destination: destination,
              travelMode: "DRIVING",
            }}
            callback={directionsCallback}
          />
        )}

        {directions && (
          <DirectionsRenderer
            options={{
              directions,
              suppressMarkers: true,
              polylineOptions: { strokeColor: "#0d9488", strokeWeight: 4, strokeOpacity: 0.8 },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}