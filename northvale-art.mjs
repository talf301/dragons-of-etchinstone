// An imported personal print set stays on the device, including offline.
let faces = {};
let db;
export async function openPrints() {
  db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("etchinstone-northvale-art", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("prints");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  faces = await new Promise((resolve, reject) => {
    const request = db.transaction("prints").objectStore("prints").get("cards");
    request.onsuccess = () => resolve(request.result || {});
    request.onerror = () => reject(request.error);
  });
}
export async function importPrints(file) {
  const data = JSON.parse(await file.text()),
    next = {};
  for (let id = 0; id < 16; id++)
    for (let level = 1; level <= 4; level++) {
      const key = id + "-" + level,
        value = data[key];
      if (
        typeof value !== "string" ||
        !/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(value)
      )
        throw Error("Invalid print pack");
      next[key] = value;
    }
  if (!db) await openPrints();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("prints", "readwrite");
    tx.objectStore("prints").put(next, "cards");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  faces = next;
}
export const printOf = (id, level) => faces[id + "-" + level];
