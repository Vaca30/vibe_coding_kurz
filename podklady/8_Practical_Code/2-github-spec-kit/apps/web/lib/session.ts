'use client';

import { useEffect, useState } from 'react';

const KEY = 'imagineer.sessionId';

export function useGenerationSession(): string {
  const [id, setId] = useState('pending');
  useEffect(() => {
    let stored = window.localStorage.getItem(KEY);
    if (!stored) {
      stored = crypto.randomUUID();
      window.localStorage.setItem(KEY, stored);
    }
    setId(stored);
  }, []);
  return id;
}
