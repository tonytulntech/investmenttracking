import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

// Tema subito all'avvio (anche per la schermata di accesso, prima che l'app monti).
try {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('inv-theme') === 'light' ? 'light' : 'dark');
} catch { /* localStorage non disponibile: resta il tema predefinito */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
