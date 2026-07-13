import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  TrendingUp, LayoutDashboard, Wallet, FileText, Settings, Plus,
  Target, RefreshCcw, BarChart3, PiggyBank, Globe, History,
  Sun, Moon, ScanSearch, Layers, Eye, EyeOff, Calculator, Coins, Bitcoin,
} from 'lucide-react';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';

// Pages
import { migrateTickersPersistent } from './services/localStorageService';
import Dashboard            from './pages/Dashboard';
import Portfolio            from './pages/Portfolio';
import PortfolioPerformance from './pages/PortfolioPerformance';
import Transactions         from './pages/Transactions';
import SettingsPage         from './pages/Settings';
import Strategy             from './pages/Strategy';
import Rebalancing          from './pages/Rebalancing';
import Patrimonio           from './pages/Patrimonio';
import Mercati              from './pages/Mercati';
import Backtest             from './pages/Backtest';
import PortfolioAnalysis    from './pages/PortfolioAnalysis';
import PortfolioManager     from './pages/PortfolioManager';
import Calcolatori          from './pages/Calcolatori';
import Dividendi            from './pages/Dividendi';
import Crypto               from './pages/Crypto';

// ── Navigation structure ─────────────────────────────────────────
const primaryNav = [
  { name: 'Dashboard',   href: '/',             icon: LayoutDashboard },
  { name: 'Portfolio',   href: '/portfolio',    icon: Wallet },
  { name: 'Performance', href: '/performance',  icon: BarChart3 },
  { name: 'Transazioni', href: '/transactions', icon: FileText },
];
const toolsNav = [
  { name: 'Analisi',         href: '/analysis',     icon: ScanSearch },
  { name: 'Portafogli',      href: '/portfolios',   icon: Layers },
  { name: 'Backtest',        href: '/backtest',     icon: History },
  { name: 'Patrimonio',      href: '/patrimonio',   icon: PiggyBank },
  { name: 'Mercati',         href: '/mercati',      icon: Globe },
  { name: 'Dividendi',       href: '/dividendi',    icon: Coins },
  { name: 'Strategia',       href: '/strategy',     icon: Target },
  { name: 'Ribilanciamento', href: '/rebalancing',  icon: RefreshCcw },
  { name: 'Calcolatori',     href: '/calcolatori',  icon: Calculator },
  { name: 'Crypto',          href: '/crypto',       icon: Bitcoin },
];
const mobileNav = [
  ...primaryNav,
  { name: 'Altro', href: '/settings', icon: Settings },
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
        display: 'flex', alignItems: 'center', gap: '0.55rem',
        width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px',
        border: privacyMode ? '1px solid rgba(255,159,10,0.5)' : '1px solid transparent',
        background: privacyMode ? 'rgba(255,159,10,0.10)' : 'transparent',
        cursor: 'pointer',
        color: privacyMode ? '#FF9F0A' : 'var(--text-3)',
        fontSize: '0.8125rem', fontWeight: privacyMode ? 600 : 400,
        transition: 'all 0.2s',
      }}
    >
      {privacyMode
        ? <EyeOff size={15} />
        : <Eye size={15} />
      }
      {privacyMode ? 'Privacy ON' : 'Modalità Privacy'}
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

// ── App root ─────────────────────────────────────────────────────
function App() {
  const location = useLocation();

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
    <PrivacyProvider>
    <div className="app-root">

      {/* ── Sidebar (Desktop) ─────────────────────────────── */}
      <aside className="sidebar hidden md:flex md:flex-col">

        {/* Logo */}
        <div
          className="sidebar-logo-border"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            height: '64px', padding: '0 1.1rem', flexShrink: 0,
          }}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(140deg, #0A84FF 0%, #30D158 100%)',
            boxShadow: '0 4px 16px rgba(10,132,255,0.40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="#ffffff" />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Investment</div>
            <div className="sidebar-logo-subtitle" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              TRACKER
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1, overflowY: 'auto',
          padding: '1rem 0.65rem',
          display: 'flex', flexDirection: 'column', gap: '1.5rem',
        }}>
          {/* Primary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {primaryNav.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>

          {/* Tools */}
          <div>
            <div className="nav-section-label">Strumenti</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {toolsNav.map(item => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom actions */}
        <div
          className="sidebar-bottom-border"
          style={{
            padding: '0.75rem 0.65rem',
            display: 'flex', flexDirection: 'column', gap: '4px',
            flexShrink: 0,
          }}
        >
          <Link
            to="/transactions"
            className="btn-primary"
            style={{ justifyContent: 'center', width: '100%', fontSize: '0.8125rem', padding: '0.55rem 1rem' }}
          >
            <Plus size={15} />
            Nuova Transazione
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
      <main style={{ flex: 1, minWidth: 0 }} className="md:pl-[220px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8">
          <Routes>
            <Route path="/"                 element={<Dashboard />} />
            <Route path="/portfolio"        element={<Portfolio />} />
            <Route path="/performance"      element={<PortfolioPerformance />} />
            <Route path="/analysis"         element={<PortfolioAnalysis />} />
            <Route path="/backtest"         element={<Backtest />} />
            <Route path="/patrimonio"       element={<Patrimonio />} />
            <Route path="/transactions"     element={<Transactions />} />
            <Route path="/transactions/new" element={<Transactions />} />
            <Route path="/mercati"          element={<Mercati />} />
            <Route path="/dividendi"        element={<Dividendi />} />
            <Route path="/strategy"         element={<Strategy />} />
            <Route path="/rebalancing"      element={<Rebalancing />} />
            <Route path="/portfolios"       element={<PortfolioManager />} />
            <Route path="/calcolatori"      element={<Calcolatori />} />
            <Route path="/crypto"           element={<Crypto />} />
            <Route path="/settings"         element={<SettingsPage />} />
            <Route path="*"                element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ───────────────────────── */}
      <nav className="mobile-nav md:hidden">
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${mobileNav.length}, 1fr)`,
          padding: '0.4rem 0.5rem',
        }}>
          {mobileNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`mobile-nav-link${active ? ' active' : ''}`}
              >
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
    </PrivacyProvider>
  );
}

export default App;
