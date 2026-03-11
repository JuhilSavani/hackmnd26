const DB_NAME = 'PaperPilotDB';
const USAGE_STORE  = 'UsageStore';
const PINNED_STORE = 'PinnedStore';
const DB_VERSION = 2;

/**
 * Initialize IndexedDB instance for the application.
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject(event.target.error);

    request.onsuccess = (event) => resolve(event.target.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(USAGE_STORE)) {
        db.createObjectStore(USAGE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PINNED_STORE)) {
        db.createObjectStore(PINNED_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Fetch the usage item from IndexedDB.
 */
export async function getUsage() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(USAGE_STORE, 'readonly');
      const store = transaction.objectStore(USAGE_STORE);
      const request = store.get('ratelimit');

      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to read usage from IndexedDB:", error);
    return null;
  }
}

/**
 * Save new usage snapshot to IndexedDB.
 */
export async function saveUsage(usage) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(USAGE_STORE, 'readwrite');
      const store = transaction.objectStore(USAGE_STORE);
      const request = store.put({ id: 'ratelimit', data: usage });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save usage to IndexedDB:", error);
  }
}

/**
 * Load the persisted set of pinned thread IDs from IndexedDB.
 * Returns an array of threadId strings (empty array if none stored).
 */
export async function getPinnedThreads() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PINNED_STORE, 'readonly');
      const store = transaction.objectStore(PINNED_STORE);
      const request = store.get('pins');

      request.onsuccess = () => resolve(request.result?.data || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to read pinned threads from IndexedDB:", error);
    return [];
  }
}

/**
 * Persist the current set of pinned thread IDs to IndexedDB.
 * @param {Set<string>} pinnedSet
 */
export async function savePinnedThreads(pinnedSet) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PINNED_STORE, 'readwrite');
      const store = transaction.objectStore(PINNED_STORE);
      const request = store.put({ id: 'pins', data: Array.from(pinnedSet) });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save pinned threads to IndexedDB:", error);
  }
}
