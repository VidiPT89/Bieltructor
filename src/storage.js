// Where worlds are kept. The game reads and writes them at once from memory;
// behind it, everything goes to IndexedDB, which has room for big worlds.
// The small browser storage (localStorage) keeps a second copy of whatever
// fits in it: it is written at once, so the last save survives the app being
// closed a moment later.
//
//   backend  the big store: readAll() -> Map, put(key, text), remove(key),
//            all returning promises. null when there is none.
//   local    the small store: getItem, setItem (may throw when full),
//            removeItem, keys().
const VERSION_KEY = "biel-storage-version";
const OURS = /^biel-(worlds?$|world-|thumb-|backups?-|current$|stickers$)/;
// Pictures and backups are big and can be made again: they are not copied
// to the small store once the big one is in use.
const MIRRORED = (key) => !/^biel-(thumb|backup)-/.test(key);

const updatedAt = (text) => {
  try {
    const at = JSON.parse(text)?.updatedAt;
    return Number.isFinite(at) ? at : -Infinity;
  } catch {
    return -Infinity;
  }
};
const newestInIndex = (text) => {
  try {
    return Math.max(-Infinity, ...JSON.parse(text).map((w) => w.updatedAt));
  } catch {
    return -Infinity;
  }
};

// Brings the two stores together into the map the game reads from.
// Returns the keys whose value was taken from the small store.
export function reconcile(map, local) {
  const taken = [];
  const take = (key) => {
    map.set(key, local.getItem(key));
    taken.push(key);
  };
  const keys = local.keys().filter((key) => OURS.test(key));
  if (!map.has(VERSION_KEY)) {
    // First time: everything the game ever kept is copied over. The small
    // store is left as it is.
    for (const key of keys) if (!map.has(key)) take(key);
    return taken;
  }
  // Later: a world whose copy in the small store is newer was saved just
  // before the app closed, and the big store never got it.
  for (const key of keys)
    if (
      key.startsWith("biel-world-") &&
      updatedAt(local.getItem(key)) > updatedAt(map.get(key) ?? "")
    )
      take(key);
  if (
    local.getItem("biel-worlds") !== null &&
    local.getItem("biel-worlds") !== map.get("biel-worlds") &&
    newestInIndex(local.getItem("biel-worlds")) >=
      newestInIndex(map.get("biel-worlds") ?? "[]")
  ) {
    take("biel-worlds");
    if (local.getItem("biel-current") !== null) take("biel-current");
  }
  if (local.getItem("biel-stickers") !== null && !map.has("biel-stickers"))
    take("biel-stickers");
  return taken;
}

// Opens the storage of the game. Never fails: without a working big store
// the small one is used alone, as the game always did.
export async function openStorage({ backend, local, onError = () => {} }) {
  const plain = {
    kind: "local",
    getItem: (key) => local.getItem(key),
    setItem: (key, value) => local.setItem(key, value),
    removeItem: (key) => local.removeItem(key),
    flush: () => Promise.resolve(),
  };
  let map;
  try {
    if (!backend) return plain;
    map = await backend.readAll();
  } catch {
    return plain;
  }
  let pending = Promise.resolve(),
    failed = false;
  // Writes go one after the other; a failure is reported once.
  const later = (work) => {
    pending = pending.then(work).catch(() => {
      if (!failed) onError();
      failed = true;
    });
  };
  for (const key of reconcile(map, local))
    later(() => backend.put(key, map.get(key)));
  if (!map.has(VERSION_KEY)) {
    map.set(VERSION_KEY, "1");
    later(() => backend.put(VERSION_KEY, "1"));
  }
  return {
    kind: "indexeddb",
    getItem: (key) => map.get(key) ?? null,
    setItem(key, value) {
      const text = String(value);
      map.set(key, text);
      later(() => backend.put(key, text));
      if (!MIRRORED(key)) return;
      try {
        local.setItem(key, text);
      } catch {
        // Too big for the small store: an older copy there must not linger.
        local.removeItem(key);
      }
    },
    removeItem(key) {
      map.delete(key);
      later(() => backend.remove(key));
      local.removeItem(key);
    },
    // Resolves when everything written so far is in the big store.
    flush: () => pending,
  };
}

// IndexedDB as the big store: one table of texts by key.
export function idbBackend(name = "bieltructor", timeout = 4000) {
  if (typeof indexedDB === "undefined") return null;
  const request = (make) =>
    new Promise((resolve, reject) => {
      const r = make();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  let opening = null;
  const open = () =>
    (opening ??= new Promise((resolve, reject) => {
      // A storage that never answers must not keep the game from starting.
      const timer = setTimeout(() => reject(new Error("timeout")), timeout);
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("texts");
      r.onsuccess = () => (clearTimeout(timer), resolve(r.result));
      r.onerror = r.onblocked = () => (clearTimeout(timer), reject(r.error));
    }));
  const table = async (mode) =>
    (await open()).transaction("texts", mode).objectStore("texts");
  // A write is done when its transaction is, not when the request answers.
  const write = async (work) => {
    const store = await table("readwrite");
    work(store);
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = store.transaction.onabort = () =>
        reject(store.transaction.error);
    });
  };
  return {
    async readAll() {
      const store = await table("readonly");
      const [keys, values] = await Promise.all([
        request(() => store.getAllKeys()),
        request(() => store.getAll()),
      ]);
      return new Map(keys.map((key, i) => [key, values[i]]));
    },
    put: (key, text) => write((store) => store.put(text, key)),
    remove: (key) => write((store) => store.delete(key)),
  };
}
