import { supabase } from "../config/supabase.js";

/*
 * Token revocation. Every JWT carries the user's `token_version` (claim "tv"); the auth
 * middleware rejects a token whose tv no longer matches users.token_version. Bumping the
 * number therefore signs the user out everywhere — used after a password change / reset
 * and by "Sign out of all devices".
 *
 * Needs the column:  ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
 * Until it exists the check is skipped (logged once), so the API keeps working.
 */

const TTL_MS = 15_000; // short cache: at most one DB read per user every 15 s
const cache = new Map(); // userId -> { v, at }
let supported = true;

const isMissingColumn = (err) =>
  err && (err.code === "42703" || /token_version/.test(err.message || "") || err.code === "PGRST204");

function disable(err) {
  if (supported) console.warn("[auth] token_version column missing — token revocation is off:", err.message);
  supported = false;
}

/** Current version for a user, or null when revocation is unavailable. */
export async function getTokenVersion(userId) {
  if (!supported) return null;
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.v;

  const { data, error } = await supabase
    .from("users")
    .select("token_version")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) {
      disable(error);
      return null;
    }
    throw error;
  }
  const v = data?.token_version ?? 0;
  cache.set(userId, { v, at: Date.now() });
  return v;
}

/** +1 the user's version (all their existing tokens stop working). Returns the new version or null. */
export async function bumpTokenVersion(userId) {
  cache.delete(userId);
  const current = await getTokenVersion(userId);
  if (current === null) return null;
  const next = current + 1;
  const { error } = await supabase.from("users").update({ token_version: next }).eq("user_id", userId);
  if (error) {
    if (isMissingColumn(error)) {
      disable(error);
      return null;
    }
    throw error;
  }
  cache.set(userId, { v: next, at: Date.now() });
  return next;
}
