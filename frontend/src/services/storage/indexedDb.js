export async function saveOfflineRecord(storeName, record) {
  console.log("Saving offline record", storeName, record);
  return Promise.resolve({ storeName, record });
}

export async function getOfflineRecords(storeName) {
  console.log("Fetching offline records", storeName);
  return Promise.resolve([]);
}
