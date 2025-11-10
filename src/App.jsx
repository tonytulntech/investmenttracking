import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, Wallet, FileText, Settings, Plus, Target, RefreshCcw, BarChart3 } from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import PortfolioPerformance from './pages/PortfolioPerformance';
import Transactions from './pages/Transactions';
import SettingsPage from './pages/Settings';
import Strategy from './pages/Strategy';
import Rebalancing from './pages/Rebalancing';

function App() {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Portfolio', href: '/portfolio', icon: Wallet },
    { name: 'Performance', href: '/performance', icon: BarChart3 },
    { name: 'Transazioni', href: '/transactions', icon: FileText },
    { name: 'Strategia', href: '/strategy', icon: Target },
    { name: 'Ribilanciamento', href: '/rebalancing', icon: RefreshCcw },
    { name: 'Impostazioni', href: '/settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Investment Tracker
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  font-medium text-sm transition-all duration-200
                  ${active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Add Transaction Button */}
        <div className="p-4 border-t border-gray-200">
          <Link
            to="/transactions"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Transazione
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/performance" element={<PortfolioPerformance />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/new" element={<Transactions />} />
            <Route path="/strategy" element={<Strategy />} />
            <Route path="/rebalancing" element={<Rebalancing />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 safe-bottom z-50">
        <div className="grid grid-cols-6 gap-1 p-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex flex-col items-center gap-1 px-2 py-2 rounded-lg
                  text-xs font-medium transition-all duration-200
                  ${active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-full text-center">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

export default App;
