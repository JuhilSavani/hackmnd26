import { useState, useCallback } from 'react';

export function usePinnedThreads(initialPinnedIds = []) {
  const [pinned, setPinned] = useState(new Set(initialPinnedIds));

  const togglePin = useCallback((threadId) => {
    setPinned((prev) => {
      const newPinned = new Set(prev);
      if (newPinned.has(threadId)) {
        newPinned.delete(threadId);
      } else {
        newPinned.add(threadId);
      }
      return newPinned;
    });
  }, []);

  return { pinned, togglePin };
}
