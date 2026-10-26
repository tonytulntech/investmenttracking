import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { LEGAL } from '../config/legal';

const Calcolatori = lazy(() => import('./Calcolatori'));

/**
 * Calcolatori aperti a tutti, senza account (si servono prima dell'AuthGate, come /privacy e /termini).
 * Non leggono né salvano dati dell'utente: ogni numero resta nel browser e sparisce chiudendo la pagina.
 */
export default function PublicCalculators() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1.25rem 1rem 3rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <Link to="/calcolatori" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700 }}>
            <TrendingUp size={18} /> {LEGAL.appName}
          </Link>
          <Link to="/" className="btn-secondary" style={{ textDecoration: 'none' }}>Accedi all&apos;app</Link>
        </header>

        <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>Caricamento…</div>}>
          <Calcolatori />
        </Suspense>

        <footer style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p>
            Strumenti a scopo educativo. I risultati sono simulazioni basate sui numeri che inserisci: non sono previsioni né consigli di investimento o
            consulenza finanziaria. I dati inseriti restano nel tuo browser e non vengono salvati.
          </p>
          <nav style={{ display: 'flex', gap: '1.25rem' }}>
            <Link to="/privacy" style={{ color: 'var(--text-3)' }}>Informativa privacy</Link>
            <Link to="/termini" style={{ color: 'var(--text-3)' }}>Termini di servizio</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
