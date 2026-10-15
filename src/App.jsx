import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  TrendingUp, LayoutDashboard, Wallet, FileText, Settings, Plus,
  RefreshCcw, BarChart3, PiggyBank, Target,
  Sun, Moon, ScanSearch, Layers, Eye, EyeOff, Coins,
} from 'lucide-react';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';
import { ModeProvider, useMode } from './context/ModeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useGoalData } from './services/goalStore';
import AuthGate from './components/AuthGate';
import { PrivacyPage, TermsPage } from './pages/Legal';
import { migrateTickersPersistent } from './services/localStorageService';

// Eager: lightweight, always-visible pages
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';

// Lazy: heavy pages loaded on demand
const PortfolioPerformance = lazy(() => import('./pages/PortfolioPerformance'));
const PortfolioAnalysis    = lazy(() => import('./pages/PortfolioAnalysis'));
const Dividendi            = lazy(() => import('./pages/Dividendi'));
const Patrimonio           = lazy(() => import('./pages/Patrimonio'));
const PortfolioManager     = lazy(() => import('./pages/PortfolioManager'));
const Rebalancing          = lazy(() => import('./pages/Rebalancing'));
const Transactions         = lazy(() => import('./pages/Transactions'));
const SettingsPage         = lazy(() => import('./pages/Settings'));
const Goals                = lazy(() => import('./pages/Goals'));
const GoalWizard           = lazy(() => import('./pages/GoalWizard'));

// ── Navigation structure ─────────────────────────────────────────
// Nav snella: solo pagine che l'utente usa davvero. Le pagine "nascoste"
// (Backtest, Mercati, Strategia, Calcolatori, Crypto, PAC) restano nel repo
// ma non sono raggiungibili — se le vuoi riabilitare basta ripristinare
// import, entry di nav e route.
const primaryNav = [
  { name: 'Dashboard',   href: '/',             icon: LayoutDashboard },
  { name: 'Obiettivi',   href: '/obiettivi',    icon: Target },
  { name: 'Portfolio',   href: '/portfolio',    icon: Wallet },
  { name: 'Performance', href: '/performance',  icon: BarChart3 },
  { name: 'Transazioni', href: '/transactions', icon: FileText },
];
const toolsNav = [
  { name: 'Analisi',         href: '/analysis',     icon: ScanSearch },
  { name: 'Portafogli',      href: '/portfolios',   icon: Layers },
  { name: 'Patrimonio',      href: '/patrimonio',   icon: PiggyBank },
  { name: 'Dividendi',       href: '/dividendi',    icon: Coins },
  { name: 'Ribilanciamento', href: '/rebalancing',  icon: RefreshCcw },
];
// Mobile bottom-nav: 4 voci + FAB centrale rialzato "Nuova transazione"
const mobileNav = [
  { name: 'Home',         href: '/',             icon: LayoutDashboard },
  { name: 'Portfolio',    href: '/portfolio',    icon: Wallet },
  { name: 'Ribilancia',   href: '/rebalancing',  icon: RefreshCcw },
  { name: 'Impostazioni', href: '/settings',     icon: Settings },
];
// In modalità Guidata "Ribilancia" non è raggiungibile: al suo posto Obiettivi (le transazioni restano raggiungibili dal pulsante +).
const mobileNavGuided = [
  mobileNav[0],
  mobileNav[1],
  { name: 'Obiettivi',    href: '/obiettivi',    icon: Target },
  mobileNav[3],
];

const appRoutes = [
  { path: '/',                 element: <Dashboard /> },
  { path: '/obiettivi',        element: <Goals /> },
  { path: '/guida/inizia',     element: <GoalWizard /> },
  { path: '/portfolio',        element: <Portfolio /> },
  { path: '/performance',      element: <PortfolioPerformance /> },
  { path: '/analysis',         element: <PortfolioAnalysis /> },
  { path: '/patrimonio',       element: <Patrimonio /> },
  { path: '/transactions',     element: <Transactions /> },
  { path: '/transactions/new', element: <Transactions /> },
  { path: '/dividendi',        element: <Dividendi /> },
  { path: '/rebalancing',      element: <Rebalancing /> },
  { path: '/portfolios',       element: <PortfolioManager /> },
  { path: '/settings',         element: <SettingsPage /> },
];

// ── Single nav link (uses CSS class nav-link) ────────────────────
function NavLink({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className={`nav-link${active ? ' active' : ''}`}
    >
      <Icon size={16} className="nav-link-icon" />
      {item.name}
    </Link>
  );
}

// ── Privacy toggle button ─────────────────────────────────────────
function PrivacyToggle() {
  const { privacyMode, togglePrivacy } = usePrivacy();
  return (
    <button
      onClick={togglePrivacy}
      title={privacyMode ? 'Disattiva modalità privacy' : 'Attiva modalità privacy (nascondi nomi)'}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        width: '100%', padding: '0.38rem 0.65rem', borderRadius: '8px',
        border: privacyMode ? '1px solid rgba(255,159,10,0.5)' : '1px solid transparent',
        background: privacyMode ? 'rgba(255,159,10,0.10)' : 'transparent',
        cursor: 'pointer',
        color: privacyMode ? '#FF9F0A' : 'var(--text-3)',
        fontSize: '0.76rem', fontWeight: privacyMode ? 600 : 400,
        transition: 'all 0.2s',
      }}
    >
      {privacyMode
        ? <EyeOff size={13} />
        : <Eye size={13} />
      }
      {privacyMode ? 'Privacy ON' : 'Privacy'}
    </button>
  );
}

// ── iOS-style theme toggle pill ──────────────────────────────────
function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="theme-toggle"
      title={isDark ? 'Passa a Modalità Giorno' : 'Passa a Modalità Notte'}
    >
      <div className={`toggle-pill${isDark ? '' : ' is-light'}`}>
        <div className="toggle-thumb">
          {isDark
            ? <Moon  size={8} color="#1d1d1f" />
            : <Sun   size={8} color="#ff9f0a" />
          }
        </div>
      </div>
      <span>{isDark ? 'Modalità Notte' : 'Modalità Giorno'}</span>
    </button>
  );
}

// ── App shell (sidebar, routes, bottom nav) ──────────────────────
function AppShell() {
  const location = useLocation();
  const { mode, canAccess } = useMode();
  const visiblePrimary = primaryNav.filter(i => canAccess(i.href));
  const visibleTools   = toolsNav.filter(i => canAccess(i.href));
  const bottomNav      = mode === 'guided' ? mobileNavGuided : mobileNav;

  // ── Theme state ─────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('inv-theme');
    return saved ? saved === 'dark' : true; // default: dark
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('inv-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Normalizza i ticker via ISIN una volta all'avvio (MSF→MSFT, RY6→O, 3V64→V…)
  useEffect(() => {
    const n = migrateTickersPersistent();
    if (n > 0) console.log(`🔧 ${n} ticker normalizzati via ISIN`);
  }, []);

  const toggleTheme = () => setIsDark(d => !d);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-root">

      {/* ── Sidebar (Desktop) ─────────────────────────────── */}
      <aside className="sidebar hidden md:flex md:flex-col">

        {/* Logo (compatto) */}
        <div
          className="sidebar-logo-border"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.55rem',
            height: '54px', padding: '0 0.85rem', flexShrink: 0,
          }}
        >
          <div style={{
            width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
            background: 'var(--surface-1)',
            border: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={15} color="var(--text-1)" />
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Tracker
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1, overflowY: 'auto',
          padding: '0.75rem 0.55rem',
          display: 'flex', flexDirection: 'column', gap: '1.1rem',
        }}>
          {/* Primary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {visiblePrimary.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>

          {/* Tools */}
          {visibleTools.length > 0 && (
            <div>
              <div className="nav-section-label">Strumenti</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {visibleTools.map(item => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom actions */}
        <div
          className="sidebar-bottom-border"
          style={{
            padding: '0.6rem 0.55rem 0.75rem',
            display: 'flex', flexDirection: 'column', gap: '3px',
            flexShrink: 0,
          }}
        >
          <Link
            to="/transactions/new"
            className="btn-primary"
            style={{ justifyContent: 'center', width: '100%', fontSize: '0.76rem', padding: '0.45rem 0.8rem', marginBottom: '4px' }}
          >
            <Plus size={13} />
            Nuova
          </Link>

          <NavLink
            item={{ name: 'Impostazioni', href: '/settings', icon: Settings }}
            active={isActive('/settings')}
          />

          {/* Privacy Toggle */}
          <PrivacyToggle />

          {/* Theme Toggle */}
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0 }} className="md:pl-[188px]">
        <div className="main-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8">
          <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>Caricamento…</div>}>
            <Routes>
              {appRoutes.filter(r => canAccess(r.path)).map(r => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation (4 voci + FAB centrale) ── */}
      <nav className="mobile-nav md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
        {/* FAB centrale rialzato — "Nuova transazione" */}
        <Link to="/transactions/new" className="mobile-fab" aria-label="Nuova transazione">
          <Plus size={22} strokeWidth={2.4} />
        </Link>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 56px 1fr 1fr',
          padding: '0.35rem 0.4rem',
          alignItems: 'center',
        }}>
          {bottomNav.slice(0, 2).map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} to={item.href} className={`mobile-nav-link${active ? ' active' : ''}`}>
                <Icon size={20} />
                <span style={{ maxWidth: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          <div /> {/* spacer per il FAB */}
          {bottomNav.slice(2).map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} to={item.href} className={`mobile-nav-link${active ? ' active' : ''}`}>
                <Icon size={20} />
                <span style={{ maxWidth: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// AuthGate sta fuori dai provider che leggono localStorage all'avvio (privacy, modalità):
// montano solo dopo che i dati dell'utente sono stati sincronizzati.
// Pagine pubbliche: leggibili senza accesso (richieste anche da Google per il consenso OAuth).
const PUBLIC_PAGES = { '/privacy': PrivacyPage, '/termini': TermsPage };

// Primo accesso di un cliente (modalità Guidata assegnata): l'esercizio Obiettivi è l'unica schermata
// finché non è concluso. L'amministratore e chi usa l'app senza account non sono mai bloccati.
function OnboardingGate({ children }) {
  const { cloudEnabled, profile } = useAuth();
  const { mode } = useMode();
  const { progress } = useGoalData();
  const gated = cloudEnabled && profile && !profile.isAdmin && mode === 'guided' && !progress.onboardingCompleted;
  if (!gated) return children;
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>Caricamento…</div>}>
      <GoalWizard standalone />
    </Suspense>
  );
}

function App() {
  const { pathname } = useLocation();
  const PublicPage = PUBLIC_PAGES[pathname.replace(/\/+$/, '')];
  if (PublicPage) return <PublicPage />;

  return (
    <AuthProvider>
      <AuthGate>
        <PrivacyProvider>
          <ModeProvider>
            <OnboardingGate>
              <AppShell />
            </OnboardingGate>
          </ModeProvider>
        </PrivacyProvider>
      </AuthGate>
    </AuthProvider>
  );
}

export default App;
