import jwt from "jsonwebtoken";
import { getTokenVersion } from "../utils/tokenVersion.js";

export default async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token provided" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Revoked? (password changed / signed out of all devices). Tokens from before this
  // feature have no "tv" and count as version 0.
  try {
    const current = await getTokenVersion(payload.id);
    if (current !== null && (payload.tv ?? 0) !== current)
      return res.status(401).json({ error: "Session ended — please sign in again" });
  } catch (e) {
    return next(e);
  }

  req.user = payload;
  next();
};
