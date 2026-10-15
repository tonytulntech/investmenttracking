import React, { useState, useEffect } from 'react';
import { TrendingUp, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { sendLink, verifyCode, signInWithGoogle, googleEnabled } = useAuth();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // email | sent
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Ritorno da un accesso Google rifiutato (utente non invitato): messaggio chiaro e URL ripulito.
  useEffect(() => {
    const params = new URLSearchParams(`${window.location.search}&${window.location.hash.slice(1)}`);
    if (params.get('error') || params.get('error_code')) {
      setError('Accesso non autorizzato: questo indirizzo non risulta tra quelli invitati.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const startGoogle = async () => {
    setBusy(true); setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) { setError('Inserisci un indirizzo email valido.'); return; }
    setBusy(true); setError('');
    try {
      await sendLink(clean);
      setEmail(clean);
      setStep('sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) { setError('Il codice ha almeno 6 cifre.'); return; }
    setBusy(true); setError('');
    try {
      await verifyCode(email, code);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: 'var(--surface-1)', border: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="var(--text-1)" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Investitore</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Accesso riservato</div>
          </div>
        </div>

        {step === 'email' && googleEnabled && (
          <>
            <button type="button" className="btn-secondary" disabled={busy} onClick={startGoogle}
              style={{ width: '100%', justifyContent: 'center' }}>
              Continua con Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0', color: 'var(--text-3)', fontSize: '0.75rem' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              oppure
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          </>
        )}
        {step === 'email' ? (
          <form onSubmit={submitEmail} noValidate>
            <label htmlFor="login-email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
              La tua email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input
                id="login-email" type="email" autoComplete="email" inputMode="email" autoFocus
                className="input" style={{ paddingLeft: '2.4rem' }}
                placeholder="nome@esempio.it" value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '0.6rem 0 1rem' }}>
              Ti inviamo un link per entrare, senza password.
            </p>
            {error && <p role="alert" style={{ fontSize: '0.8rem', color: 'var(--neg)', marginBottom: '0.75rem' }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
              {busy ? 'Invio in corso…' : 'Invia link di accesso'}
            </button>
          </form>
        ) : (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-1)', fontWeight: 600, marginBottom: '0.4rem' }}>Controlla la tua email</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
              Se <strong>{email}</strong> è autorizzato, hai ricevuto un link: aprilo da questo dispositivo per entrare.
              Controlla anche nello spam.
            </p>
            <form onSubmit={submitCode} noValidate>
              <label htmlFor="login-code" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
                Oppure inserisci il codice dell&apos;email
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  id="login-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
                  className="input" style={{ paddingLeft: '2.4rem', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}
                  placeholder="000000" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {error && <p role="alert" style={{ fontSize: '0.8rem', color: 'var(--neg)', margin: '0.6rem 0 0' }}>{error}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.9rem' }} disabled={busy || !code}>
                {busy ? 'Verifica…' : 'Entra con il codice'}
              </button>
            </form>
            <button
              type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Usa un altro indirizzo
            </button>
          </div>
        )}

        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Strumento educativo e di monitoraggio personale: non costituisce consulenza finanziaria né raccomandazione di investimento.
        </p>
      </div>
    </div>
  );
}
