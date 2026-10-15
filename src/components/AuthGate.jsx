import React from 'react';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';

const centered = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' };

function Message({ title, children }) {
  return (
    <div style={centered}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.5rem' }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

function ConflictChoice({ onChoose }) {
  const option = (choice, title, text) => (
    <button
      type="button" onClick={() => onChoose(choice)}
      className="text-left rounded-lg p-4 transition-colors"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', width: '100%', cursor: 'pointer' }}
    >
      <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{title}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>{text}</div>
    </button>
  );
  return (
    <Message title="Hai dati su questo dispositivo e nel tuo account">
      <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
        Quale versione vuoi tenere? L'altra verrà sostituita.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {option('cloud', 'Usa i dati del mio account', 'Consigliato se hai già usato l\'app su un altro dispositivo.')}
        {option('local', 'Usa i dati di questo dispositivo', 'Sostituisce quelli salvati nel tuo account.')}
      </div>
    </Message>
  );
}

/** Protegge l'app: mostra login/sincronizzazione finché i dati dell'utente non sono pronti. */
export default function AuthGate({ children }) {
  const { cloudEnabled, phase, error, retry, signOut, resolveConflict } = useAuth();
  if (!cloudEnabled) return children;

  switch (phase) {
    case 'loading':
      return <div style={{ ...centered, color: 'var(--text-3)' }}>Caricamento…</div>;
    case 'syncing':
      return <div style={{ ...centered, color: 'var(--text-3)' }}>Sincronizzazione dei tuoi dati…</div>;
    case 'signedOut':
      return <Login />;
    case 'conflict':
      return <ConflictChoice onChoose={resolveConflict} />;
    case 'error':
      return (
        <Message title="Sincronizzazione non riuscita">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
            {error || 'Controlla la connessione e riprova.'} I tuoi dati non sono stati modificati.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn-primary" onClick={retry}>Riprova</button>
            <button className="btn-secondary" onClick={() => signOut({ force: true })}>Esci</button>
          </div>
        </Message>
      );
    default:
      return children;
  }
}
