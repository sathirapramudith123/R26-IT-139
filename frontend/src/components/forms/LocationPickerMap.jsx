"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

import { t } from "@/lib/i18n";
import { MAPS_LOADER, MARKER_ICONS, fetchRoute, formatDuration } from "@/lib/maps";

const DEFAULT_CENTER = { lat: 6.9147, lng: 79.9727 }; // Malabe default

// extraMarkers: optional array of { lat, lng, label, highlight, cheapest }.
// Used by the Procurement form to plot suppliers of the selected item
// (highlight=true on the nearest one) — SupplierForm just doesn't pass this,
// so nothing changes there.
//
// routeTo: optional { lat, lng } — the delivery/journey destination. When
// given (or derivable from a highlighted extraMarker), a road route from
// `coords` to that point is drawn on the map with its distance and time.
export default function LocationPickerMap({ coords, onPick, extraMarkers = [], routeTo, showRoute = true }) {
  const { isLoaded, loadError } = useJsApiLoader(MAPS_LOADER);

  const center = coords || DEFAULT_CENTER;
  const destination = routeTo || extraMarkers.find((m) => m.highlight);

  const [route, setRoute] = useState(null); // { path, km, mins }
  const [routeError, setRouteError] = useState(null);

  const mapRef = useRef(null);
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // ---- Search box (Places API "New": AutocompleteSuggestion) ----
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const sessionRef = useRef(null); // one billing session per search → pick
  const debounceRef = useRef(null);

  function onQueryChange(value) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          await google.maps.importLibrary("places");
        sessionRef.current ??= new AutocompleteSessionToken();
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["lk"],
        });
        const list = (res.suggestions || []).map((s) => s.placePrediction).filter(Boolean);
        setSuggestions(list);
        setSearchError(list.length ? null : t("No places found."));
      } catch (err) {
        console.warn("Place search failed:", err.message);
        setSuggestions([]);
        setSearchError(t("Map search failed"));
      }
    }, 300);
  }

  async function pickSuggestion(prediction) {
    setSuggestions([]);
    setQuery(prediction.text.toString());
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["location"] });
      sessionRef.current = null;
      const lat = place.location.lat();
      const lng = place.location.lng();
      onPick(lat, lng);
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(16);
    } catch (err) {
      console.warn("Place lookup failed:", err.message);
      setSearchError(t("Couldn't look up that place."));
    }
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // ---- Route: refetch whenever the origin/destination pair changes ----
  useEffect(() => {
    if (!isLoaded || !showRoute || !coords || !destination) {
      setRoute(null);
      setRouteError(null);
      return;
    }
    let cancelled = false;
    fetchRoute(coords, { lat: destination.lat, lng: destination.lng })
      .then((r) => {
        if (cancelled) return;
        setRoute(r);
        setRouteError(r ? null : t("No route found"));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Route failed:", err.message);
        setRoute(null);
        setRouteError(t("No route found"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, showRoute, coords?.lat, coords?.lng, destination?.lat, destination?.lng]);

  const onMapClick = useCallback(
    (e) => {
      onPick(e.latLng.lat(), e.latLng.lng());
    },
    [onPick],
  );

  if (loadError) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-500 dark:border-red-900 dark:bg-red-950/40">
        {t("Couldn't load Google Maps. Check the API key.")}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
        {t("Loading map…")}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search box — type a place/address, pick a suggestion to jump there */}
      <div className="absolute left-3 top-3 z-10 w-[calc(100%-5.5rem)] max-w-sm sm:w-72">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // don't submit the surrounding form
              if (suggestions[0]) pickSuggestion(suggestions[0]);
            }
          }}
          placeholder={t("Search a place or address…")}
          className="w-full rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        />
        {suggestions.length > 0 && (
          <ul className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {suggestions.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(p)}
                  className="block w-full px-3 py-2 text-left hover:bg-brand-50 dark:hover:bg-slate-800"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {p.mainText?.toString()}
                  </span>
                  <span className="block text-xs text-slate-500">{p.secondaryText?.toString()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchError && suggestions.length === 0 && query.trim() && (
          <p className="mt-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-red-500 shadow-sm dark:bg-slate-900/95">
            {searchError}
          </p>
        )}
      </div>

      {(route || routeError) && (
        <div className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
          {route ? (
            <span className="text-brand-700 dark:text-brand-400">
              🚗 {route.km} {t("km · ⏱")} {formatDuration(route.mins)}
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
        {coords && <Marker position={coords} icon={MARKER_ICONS.main} />}

        {extraMarkers.map((m, i) => (
          <Marker
            key={i}
            position={{ lat: m.lat, lng: m.lng }}
            icon={
              m.highlight ? MARKER_ICONS.nearest : m.cheapest ? MARKER_ICONS.cheapest : MARKER_ICONS.supplier
            }
            title={m.label}
          />
        ))}

        {route && (
          <Polyline
            path={route.path}
            options={{ strokeColor: "#2a5bdb", strokeWeight: 4, strokeOpacity: 0.8 }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
