"use client";

import { useEffect, useState } from "react";

// "6.91182, 79.97460" — a delivery location saved as raw coordinates
const COORD_TEXT = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

export function parseCoordText(text) {
  const m = COORD_TEXT.exec(String(text ?? ""));
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const cache = new Map();

/** Street address for a map point (OpenStreetMap, same service the procurement form uses); null when unknown. */
export function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${lat}&lon=${lng}`,
      )
        .then((r) => r.json())
        .then((d) => d.display_name || null)
        .catch(() => {
          cache.delete(key); // try again next time
          return null;
        }),
    );
  }
  return cache.get(key);
}

/**
 * The text to show for a saved location: the address as-is, or — when it was saved as
 * "lat, lng" — the looked-up address. `pending` is true while looking it up.
 */
export function useReadableLocation(text) {
  const point = parseCoordText(text);
  const [resolved, setResolved] = useState({ for: null, address: null });

  useEffect(() => {
    if (!point) return;
    let alive = true;
    reverseGeocode(point.lat, point.lng).then((address) => alive && setResolved({ for: text, address }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!point) return { text, point: null, pending: false };
  const done = resolved.for === text;
  return { text: done ? resolved.address : null, point, pending: !done };
}
