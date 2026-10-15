import React, { createContext, useContext, useState, useCallback } from 'react';
import { storage } from '../services/storageAdapter';
import { useAuth } from './AuthContext';
import { MODE_STORAGE_KEY, DEFAULT_MODE, isValidMode, isRouteAllowed, resolveMode, canChangeMode } from '../config/modes';

const ModeContext = createContext({
  mode: DEFAULT_MODE,
  setMode: () => {},
  canAccess: () => true,
  canChangeMode: true,
});

// Lettura sincrona all'avvio (come tema e privacy). null = nessuna scelta locale salvata.
function readLocalMode() {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return isValidMode(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function ModeProvider({ children }) {
  const { cloudEnabled, profile } = useAuth();
  const [localMode, setLocalMode] = useState(readLocalMode);

  const mode = resolveMode({ cloudEnabled, profile, localMode });
  const mayChange = canChangeMode({ cloudEnabled, profile });

  // Solo chi può cambiare la modalità (proprietario in locale, amministratore con account).
  const setMode = useCallback((next) => {
    if (!mayChange || !isValidMode(next)) return;
    setLocalMode(next);
    storage.set(MODE_STORAGE_KEY, next);
  }, [mayChange]);

  const canAccess = useCallback((pathname) => isRouteAllowed(mode, pathname), [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode, canAccess, canChangeMode: mayChange }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
