import React, { createContext, useContext, useState, useCallback } from 'react';
import { storage } from '../services/storageAdapter';
import { MODE_STORAGE_KEY, DEFAULT_MODE, isValidMode, isRouteAllowed } from '../config/modes';

const ModeContext = createContext({
  mode: DEFAULT_MODE,
  setMode: () => {},
  canAccess: () => true,
});

// Lettura sincrona all'avvio (come tema e privacy) per evitare il flash della nav sbagliata.
function readInitialMode() {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return isValidMode(saved) ? saved : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(readInitialMode);

  const setMode = useCallback((next) => {
    if (!isValidMode(next)) return;
    setModeState(next);
    storage.set(MODE_STORAGE_KEY, next);
  }, []);

  const canAccess = useCallback((pathname) => isRouteAllowed(mode, pathname), [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode, canAccess }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
