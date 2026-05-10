"use client";

/**
 * Show this banner whenever `isOffline` from useInventory / useSuppliers is true.
 *
 * Usage:
 *   const { items, isOffline, fetchAll } = useInventory();
 *   <OfflineBanner show={isOffline} onRetry={fetchAll} />
 */
export default function OfflineBanner({ show, onRetry }) {
  if (!show) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-center gap-2">
        <span>📶</span>
        <span>
          You appear to be offline. Showing cached data from your last
          successful sync.
        </span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 shrink-0 rounded-lg bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}