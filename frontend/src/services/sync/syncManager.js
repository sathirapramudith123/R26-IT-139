import { getOfflineRecords } from "../storage/indexedDb";

export async function syncAllOfflineData() {
  const stores = ["inventory", "ledger", "procurement", "savings", "transactions"];
  const pending = await Promise.all(stores.map((store) => getOfflineRecords(store)));
  return pending.flat();
}
