import { apiClient } from "@/services/api/client";
import { dbSet, dbGetAll, dbDelete } from "@/services/storage/indexedDb";
import { isOnline } from "@/lib/helpers/index";

const STORE = "sync_queue";

export async function queueOperation(operation) {
  await dbSet(STORE, {
    ...operation,
    queued_at: new Date().toISOString(),
    status:    "pending",
  });
}

export async function getPendingOperations() {
  const all = await dbGetAll(STORE);
  return all.filter(op => op.status === "pending");
}

export async function runSync() {
  if (!isOnline()) {
    console.warn("[SyncManager] Offline — sync skipped.");
    return { synced: 0, failed: 0, skipped: true };
  }

  const pending = await getPendingOperations();
  if (pending.length === 0) return { synced: 0, failed: 0, skipped: false };

  const operations = pending.map(op => ({
    operation_id:   String(op.id),
    operation_type: op.operation_type,
    entity_type:    op.entity_type,
    entity_id:      op.entity_id ?? null,
    payload:        op.payload ?? {},
    timestamp:      op.queued_at,
  }));

  try {
    const result = await apiClient.post("/sync/submit", { operations });

    let synced = 0;
    let failed = 0;

    for (const op of pending) {
      const res = result?.results?.find(r => r.operation_id === String(op.id));
      if (res?.status === "queued" || res?.status === "applied") {
        await dbDelete(STORE, op.id);
        synced++;
      } else {
        await dbSet(STORE, { ...op, status: "failed", error: res?.error });
        failed++;
      }
    }

    return { synced, failed, skipped: false };
  } catch (err) {
    console.error("[SyncManager] Batch submit failed:", err.message);
    return { synced: 0, failed: pending.length, skipped: false, error: err.message };
  }
}

export async function resolveConflict(conflictId, resolution) {
  return apiClient.post(`/sync/resolve/${conflictId}`, { resolution });
}

export async function getSyncStatus() {
  return apiClient.get("/sync/status");
}

export async function getConflicts() {
  return apiClient.get("/sync/conflicts");
}

export function setupAutoSync(intervalMs = 30000) {
  if (typeof window === "undefined") return () => {};
  const timer = setInterval(() => {
    if (isOnline()) runSync().catch(console.warn);
  }, intervalMs);
  window.addEventListener("online", () => runSync().catch(console.warn));
  return () => {
    clearInterval(timer);
    window.removeEventListener("online", () => {});
  };
}
