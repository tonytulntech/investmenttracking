import React, { useMemo, useState, useEffect } from 'react';
import { Coins, Edit3, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SummaryCard } from './ui/summary-card';
import { buildDGPosition, portfolioKPIs } from '../services/dividendGrowthService';
import { STOCK_DB } from '../data/stockDividendData';

const GOAL_KEY = 'inv_dividend_annual_goal_v1';

const eur0 = (n) => '€' + Math.round(n).toLocaleString('it-IT');
const eur2 = (n) => '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * DividendGoalCard — Dashboard: mostra il progresso verso l'obiettivo dividendi
 * annuo (utile netto), con breakdown Monthly / Daily / Hourly ispirato al
 * pattern "Dividend Goal". Il goal e' modificabile inline (persistito).
 */
export default function DividendGoalCard({ holdings = [], prices = {} }) {
  const [goal, setGoal] = useState(() => {
    const raw = Number(localStorage.getItem(GOAL_KEY));
    return raw > 0 ? raw : 12000;   // default: €12k annui netti
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal);

  useEffect(() => { setDraft(goal); }, [goal]);
  const saveGoal = () => {
    const n = Number(draft) || 0;
    localStorage.setItem(GOAL_KEY, String(n));
    setGoal(n);
    setEditing(false);
  };

  // Costruisci le posizioni dividendi dai holdings che hanno metadata
  const kpis = useMemo(() => {
    const positions = (holdings || [])
      .filter(h => !h.isCash && (h.marketValue || 0) > 0)
      .map(h => {
        const staticData = STOCK_DB[h.ticker] || STOCK_DB[(h.ticker || '').split('.')[0]];
        return buildDGPosition(h, {}, staticData);
      })
      .filter(p => p && (p.annualDividendPerShare || 0) > 0);
    return portfolioKPIs(positions, prices);
  }, [holdings, prices]);

  const annualNet = kpis.annualNet || 0;
  const monthlyNet = kpis.monthlyNet || 0;
  const dailyNet = annualNet / 365;
  const hourlyNet = annualNet / (365 * 24);
  const monthlyGoal = goal / 12;
  const dailyGoal = goal / 365;
  const hourlyGoal = goal / (365 * 24);
  const progress = goal > 0 ? (annualNet / goal) * 100 : 0;

  return (
    <SummaryCard
      title="Obiettivo Dividendi"
      subtitle={`Reddito passivo netto · ${kpis.numPositions} posizioni`}
      icon={<Coins size={16} />}
      accent="#3FB950"   // verde: si allinea al concetto di guadagno/reddito
      value={eur0(annualNet)}
      target={editing ? undefined : `${eur0(goal)} annui`}
      progress={progress}
      progressLabel="Progresso annuo"
      stats={[
        { label: 'Mensile', value: eur2(monthlyNet), target: eur2(monthlyGoal) },
        { label: 'Giornaliero', value: eur2(dailyNet), target: eur2(dailyGoal) },
        { label: 'Orario', value: eur2(hourlyNet), target: eur2(hourlyGoal) },
      ]}
      footer={
        editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Nuovo goal €:</span>
            <input
              type="number" min={0} step={500}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              style={{
                width: 100, background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
                borderRadius: 6, padding: '3px 7px', color: 'var(--text-1)', fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)', textAlign: 'right',
              }}
            />
            <button onClick={saveGoal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3FB950', padding: 2 }}>
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-3)', fontSize: '0.68rem',
            }}
          >
            <Edit3 size={11} /> Modifica obiettivo
          </button>
        )
      }
      cta={annualNet > 0 ? { label: 'Vedi tutti i dividendi →', href: '/dividendi' } : undefined}
    />
  );
}
