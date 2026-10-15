import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        background: 'var(--bg, #0a0a0a)',
        color: 'var(--text-1, #f5f5f7)',
      }}>
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1.5rem' }}>
            Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: '1px solid var(--border, #333)',
                background: 'transparent', color: 'inherit',
                cursor: 'pointer', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              Riprova
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: 'none',
                background: 'var(--accent, #7C82FF)', color: '#fff',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <RefreshCcw size={14} />
              Ricarica pagina
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
