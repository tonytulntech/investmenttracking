'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  LineChart,
  FlaskConical,
  Settings,
  TrendingUp
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Briefcase, label: 'Holdings', href: '/dashboard/holdings' },
  { icon: ArrowLeftRight, label: 'Transactions', href: '/dashboard/transactions' },
  { icon: FlaskConical, label: 'Backtest', href: '/dashboard/backtesting' },
  { icon: LineChart, label: 'Analytics', href: '/dashboard/analytics' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <Link href="/dashboard" className="mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <Link href="/settings">
        <div className="sidebar-item" title="Settings">
          <Settings className="w-5 h-5" />
        </div>
      </Link>
    </aside>
  );
}
