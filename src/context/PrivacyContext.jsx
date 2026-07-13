import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────
const PrivacyContext = createContext({
  privacyMode: false,
  togglePrivacy: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────
export function PrivacyProvider({ children }) {
  const [privacyMode, setPrivacyMode] = useState(
    () => localStorage.getItem('privacy-mode') === 'true',
  );

  const togglePrivacy = useCallback(() => {
    setPrivacyMode(v => {
      const next = !v;
      localStorage.setItem('privacy-mode', String(next));
      return next;
    });
  }, []);

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePrivacy() {
  return useContext(PrivacyContext);
}

/**
 * <Blur> — renders children blurred when privacy mode is ON.
 *
 * Usage:
 *   <Blur>{h.name}</Blur>
 *   <Blur tag="div" style={{ fontWeight: 700 }}>{h.ticker}</Blur>
 *
 * Props:
 *   tag        – wrapping HTML element (default: 'span')
 *   strong     – stronger blur (default: false → 6px, true → 9px)
 *   className  – extra class names
 *   style      – extra inline styles
 */
export function Blur({ children, tag: Tag = 'span', strong = false, className = '', style = {} }) {
  const { privacyMode } = usePrivacy();

  if (!privacyMode) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={`privacy-blur${strong ? ' privacy-blur--strong' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden="true"
      title="Privacy mode attivo"
    >
      {children}
    </Tag>
  );
}
