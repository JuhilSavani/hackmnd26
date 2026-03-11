import { useState, useCallback, useEffect } from 'react';
import { getPinnedThreads, savePinnedThreads } from '../indexedDB.js';

/**
 * usePinnedThreads
 *
 * Manages the set of pinned thread IDs with IndexedDB persistence.
 * On mount, loads any previously pinned threads from IndexedDB and merges
 * them with the `serverPinnedIds` returned from the API so both sources
 * are respected. Every toggle is immediately written back to IndexedDB.
 *
 * @param {string[]} serverPinnedIds - IDs already marked as pinned on the server
 */
export function usePinnedThreads(serverPinnedIds = []) {
  const [pinned, setPinned] = useState(new Set(serverPinnedIds));
  const [loaded, setLoaded] = useState(false);

  // Hydrate from IndexedDB on first mount
  useEffect(() => {
    let cancelled = false;
    getPinnedThreads().then((storedIds) => {
      if (cancelled) return;
      setPinned((prev) => {
        // Merge server-side pins with locally stored pins
        const merged = new Set([...prev, ...storedIds]);
        return merged;
      });
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []); // run once on mount

  // When server pins arrive (after threads load), merge them in
  useEffect(() => {
    if (!loaded) return; // don't overwrite before hydration completes
    setPinned((prev) => {
      const merged = new Set([...prev, ...serverPinnedIds]);
      // Only update state if something actually changed
      if (merged.size === prev.size && [...merged].every((id) => prev.has(id))) return prev;
      return merged;
    });
  }, [serverPinnedIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePin = useCallback((threadId) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      // Persist immediately — fire-and-forget
      savePinnedThreads(next);
      return next;
    });
  }, []);

  return { pinned, togglePin };
}
