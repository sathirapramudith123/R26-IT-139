// Shared Google Maps setup for every map in the app.

// Every map must load the script with the same options — @react-google-maps throws
// "Loader must not be called again with different options" otherwise.
const LIBRARIES = ["places"];
export const MAPS_LOADER = {
  id: "google-map-script",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  libraries: LIBRARIES,
};

export const MARKER_ICONS = {
  main: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  supplier: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  nearest: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  cheapest: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
};

export function formatDuration(mins) {
  if (mins == null) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// Driving route between two points → { path, km, mins } or null. Uses the Routes API and
// falls back to the older Directions service, so it works with whichever one the key allows.
export async function fetchRoute(origin, destination) {
  try {
    const { Route } = await google.maps.importLibrary("routes");
    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      travelMode: "DRIVING",
      fields: ["distanceMeters", "durationMillis", "path"],
    });
    const r = routes?.[0];
    if (r) {
      return {
        path: r.path.map((p) => ({ lat: p.lat, lng: p.lng })),
        km: (r.distanceMeters / 1000).toFixed(1),
        mins: Math.round(r.durationMillis / 60000),
      };
    }
  } catch (err) {
    console.warn("Routes API unavailable, trying the Directions service:", err.message);
  }
  const result = await new google.maps.DirectionsService().route({
    origin,
    destination,
    travelMode: "DRIVING",
  });
  const route = result.routes?.[0];
  const leg = route?.legs?.[0];
  if (!leg) return null;
  return {
    path: route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })),
    km: (leg.distance.value / 1000).toFixed(1),
    mins: Math.round(leg.duration.value / 60),
  };
}
