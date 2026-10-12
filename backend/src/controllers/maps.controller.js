import axios from "axios";

// Google Maps web services called on behalf of the mobile app, so the key stays on the
// server (GOOGLE_MAPS_API_KEY in backend/.env) and is never built into the APK.
// Only these services and query parameters are forwarded.
const SERVICES = {
  geocode: { path: "/maps/api/geocode/json", params: ["latlng", "address"] },
  autocomplete: { path: "/maps/api/place/autocomplete/json", params: ["input"] },
  "place-details": { path: "/maps/api/place/details/json", params: ["place_id", "fields"] },
  directions: { path: "/maps/api/directions/json", params: ["origin", "destination", "mode"] },
};

const google = axios.create({ baseURL: "https://maps.googleapis.com", timeout: 8000 });

export const proxy = async (req, res) => {
  const service = SERVICES[req.params.service];
  if (!service) {
    return res
      .status(400)
      .json({ error: `Invalid service. Must be one of: ${Object.keys(SERVICES).join(", ")}` });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "Map search is not set up on the server (GOOGLE_MAPS_API_KEY)." });
  }

  const params = { key };
  for (const p of service.params) {
    if (typeof req.query[p] === "string" && req.query[p].length <= 300) params[p] = req.query[p];
  }
  try {
    // Google's own JSON (with its "status" field) is returned as it is
    const { data } = await google.get(service.path, { params });
    return res.json(data);
  } catch {
    return res.status(502).json({ error: "Google Maps could not be reached." });
  }
};
