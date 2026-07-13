/**
 * dividendGrowthService.js
 * Metadati DG per ticker (moat, ROIC, CAGR div., ecc.) + calcoli analitici.
 * Le POSIZIONI vengono da calculatePortfolio() — unica fonte di verità.
 * I metadati (fondamentali, strategia) sono persistiti in localStorage
 * sotto 'dg_metadata' come { [TICKER]: { ... } }.
 */

const META_KEY = 'dg_metadata';

// ── Metadati per ticker ────────────────────────────────────────────────────────

export function getAllDGMetadata() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; }
}

export function getDGMetadata(ticker) {
  return getAllDGMetadata()[ticker?.toUpperCase()] || {};
}

export function saveDGMetadata(ticker, data) {
  const all = getAllDGMetadata();
  all[ticker.toUpperCase()] = { ...all[ticker.toUpperCase()], ...data };
  localStorage.setItem(META_KEY, JSON.stringify(all));
}

export function deleteDGMetadata(ticker) {
  const all = getAllDGMetadata();
  delete all[ticker.toUpperCase()];
  localStorage.setItem(META_KEY, JSON.stringify(all));
}

/**
 * Costruisce un oggetto "posizione DG" a partire da un holding di calculatePortfolio()
 * arricchito con dati statici (stockDividendData.js) e metadati utente.
 *
 * @param {Object} holding   – oggetto da calculatePortfolio(): { ticker, quantity, avgPrice, ... }
 * @param {Object} meta      – metadati utente da dg_metadata (può essere {})
 * @param {Object|null} staticData – dati da getStockDefaults(ticker) (può essere null)
 */
export function buildDGPosition(holding, meta = {}, staticData = null) {
  const sd = staticData || {};
  return {
    id:                     holding.ticker,
    ticker:                 holding.ticker,
    name:                   meta.name || sd.name || holding.name || holding.ticker,
    shares:                 holding.quantity ?? holding.shares ?? 0,
    avgCostBasis:           holding.avgPrice ?? holding.avgCostBasis ?? 0,
    sector:                 meta.sector || sd.sector || 'Altro',
    geography:              meta.geography || sd.geography || 'US',
    assetType:              meta.assetType || sd.assetType || 'Stock',
    dividendPerShare:       meta.dividendPerShare   ?? sd.dividendPerShare   ?? 0,
    dividendFrequency:      meta.dividendFrequency  || sd.dividendFrequency  || 'Quarterly',
    paymentMonths:          meta.paymentMonths      || sd.paymentMonths      || [],
    dividendGrowthRate:     meta.dividendGrowthRate ?? sd.dividendGrowthRate ?? 0,
    moatRating:             meta.moatRating         || sd.moatRating         || 'None',
    lynchCategory:          meta.lynchCategory      || sd.lynchCategory      || 'SlowGrower',
    consecutiveDividendYears: meta.consecutiveDividendYears ?? sd.consecutiveDividendYears ?? 0,
    payoutRatio:            meta.payoutRatio  ?? sd.payoutRatio  ?? 0,
    roe:                    meta.roe          ?? sd.roe          ?? 0,
    roic:                   meta.roic         ?? sd.roic         ?? 0,
    peRatio:                meta.peRatio      ?? sd.peRatio      ?? 0,
    pegRatio:               meta.pegRatio     ?? sd.pegRatio     ?? 0,
    targetWeight:           meta.targetWeight ?? 0,
    entryPrice:             meta.entryPrice   ?? 0,
    notes:                  meta.notes        || '',
  };
}

// ── Calcoli singola posizione ─────────────────────────────────────────────────

export function annualGross(pos) {
  return (pos.shares || 0) * (pos.dividendPerShare || 0);
}

export function annualNet(pos, taxRate = 0.26) {
  return annualGross(pos) * (1 - taxRate);
}

export function marketValue(pos, prices = {}) {
  const price = prices[pos.ticker]?.price || pos.avgCostBasis || 0;
  return (pos.shares || 0) * price;
}

export function currentYield(pos, prices = {}) {
  const price = prices[pos.ticker]?.price || 0;
  return price > 0 ? (pos.dividendPerShare / price) * 100 : 0;
}

export function yieldOnCost(pos) {
  return pos.avgCostBasis > 0 ? ((pos.dividendPerShare || 0) / pos.avgCostBasis) * 100 : 0;
}

export function unrealizedPL(pos, prices = {}) {
  const price = prices[pos.ticker]?.price || pos.avgCostBasis;
  return (pos.shares || 0) * (price - pos.avgCostBasis);
}

// ── Calcoli portafoglio ───────────────────────────────────────────────────────

export function portfolioKPIs(positions, prices = {}, taxRate = 0.26) {
  if (!positions.length) return {
    totalValue: 0, totalCost: 0, annualGross: 0, annualNet: 0,
    monthlyNet: 0, yieldPct: 0, yocPct: 0, numPositions: 0, pnl: 0,
  };

  const totalValue = positions.reduce((s, p) => s + marketValue(p, prices), 0);
  const totalCost  = positions.reduce((s, p) => s + (p.shares || 0) * (p.avgCostBasis || 0), 0);
  const gross      = positions.reduce((s, p) => s + annualGross(p), 0);
  const net        = gross * (1 - taxRate);
  const yieldPct   = totalValue > 0 ? (gross / totalValue) * 100 : 0;
  const yocPct     = totalCost  > 0 ? (gross / totalCost)  * 100 : 0;

  return {
    totalValue, totalCost, annualGross: gross, annualNet: net,
    monthlyNet: net / 12, yieldPct, yocPct,
    numPositions: positions.length,
    pnl: totalValue - totalCost,
  };
}

// ── Calendario dividendi ──────────────────────────────────────────────────────

export function dividendCalendar(positions, year, taxRate = 0.26) {
  const currentYear = new Date().getFullYear();
  const yearDiff    = year - currentYear; // 0 = anno corrente, 1 = +1 anno, ecc.
  const isFuture    = yearDiff > 0;
  const netFactor   = 1 - taxRate; // aliquota reale impostata dall'utente

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, events: [], totalGross: 0, totalNet: 0, isEstimate: isFuture,
  }));

  positions.forEach(pos => {
    const payMonths = pos.paymentMonths || [];
    const freq      = pos.dividendFrequency || 'Quarterly';

    // Applica crescita annuale composta per anni futuri
    // Usa dividendGrowthRate configurato dall'utente, default 3% per azioni, 0% per ETF
    const growthRate   = (pos.dividendGrowthRate ?? (pos.isETF ? 0 : 3)) / 100;
    const growthFactor = isFuture ? Math.pow(1 + growthRate, yearDiff) : 1;
    const adjustedDPS  = (pos.dividendPerShare || 0) * growthFactor;

    const perEvent  = freq === 'Monthly'    ? adjustedDPS / 12
                    : freq === 'Quarterly'  ? adjustedDPS / 4
                    : freq === 'SemiAnnual' ? adjustedDPS / 2
                    : adjustedDPS;

    payMonths.forEach(m => {
      const idx   = m - 1;
      const gross = perEvent * (pos.shares || 0);
      months[idx].events.push({
        pos, gross, net: gross * netFactor, freq,
        growthFactor,      // per mostrare il moltiplicatore nell'UI
        isEstimate: isFuture,
      });
      months[idx].totalGross += gross;
      months[idx].totalNet   += gross * netFactor;
    });
  });

  return months;
}

// ── Prossimo dividendo ────────────────────────────────────────────────────────

export function nextDividend(positions, taxRate = 0.26) {
  const now       = new Date();
  const currMonth = now.getMonth() + 1;
  const currYear  = now.getFullYear();
  const netFactor = 1 - taxRate;

  let best = null;
  let bestMonthOffset = Infinity;

  positions.forEach(pos => {
    (pos.paymentMonths || []).forEach(m => {
      let offset = m - currMonth;
      if (offset < 0) offset += 12;
      if (offset < bestMonthOffset) {
        bestMonthOffset = offset;
        const targetMonth = ((currMonth + offset - 1) % 12) + 1;
        const targetYear  = currMonth + offset > 12 ? currYear + 1 : currYear;
        const freq        = pos.dividendFrequency || 'Quarterly';
        const perEvent    = freq === 'Monthly'    ? (pos.dividendPerShare || 0) / 12
                          : freq === 'Quarterly'  ? (pos.dividendPerShare || 0) / 4
                          : freq === 'SemiAnnual' ? (pos.dividendPerShare || 0) / 2
                          : (pos.dividendPerShare || 0);
        best = {
          ticker: pos.ticker,
          name:   pos.name,
          month:  targetMonth,
          year:   targetYear,
          grossAmount: perEvent * (pos.shares || 0),
          netAmount:   perEvent * (pos.shares || 0) * netFactor,
        };
      }
    });
  });

  return best;
}

// ── Proiezione Yield on Cost ──────────────────────────────────────────────────

export function yocProjection(positions, years = 20) {
  if (!positions.length) return [];
  const totalCost = positions.reduce((s, p) => s + (p.shares || 0) * (p.avgCostBasis || 0), 0);
  if (totalCost === 0) return [];

  const currentYear = new Date().getFullYear();
  return Array.from({ length: years + 1 }, (_, n) => {
    const calc = (mult) => {
      const totalIncome = positions.reduce((s, p) => {
        const cagr = ((p.dividendGrowthRate || 0) / 100) * mult;
        return s + (p.dividendPerShare || 0) * Math.pow(1 + cagr, n) * (p.shares || 0);
      }, 0);
      return (totalIncome / totalCost) * 100;
    };
    return {
      year: currentYear + n,
      bear: parseFloat(calc(0.7).toFixed(2)),
      base: parseFloat(calc(1.0).toFixed(2)),
      bull: parseFloat(calc(1.3).toFixed(2)),
    };
  });
}

// ── Proiezione rendita mensile ────────────────────────────────────────────────

export function incomeProjection(positions, years = 20, pacMonthly = 0, taxRate = 0.26) {
  if (!positions.length) return [];
  const currentYear = new Date().getFullYear();
  return Array.from({ length: years + 1 }, (_, n) => {
    const gross = positions.reduce((s, p) => {
      const cagr = (p.dividendGrowthRate || 0) / 100;
      return s + (p.dividendPerShare || 0) * Math.pow(1 + cagr, n) * (p.shares || 0);
    }, 0);
    return {
      year:         currentYear + n,
      monthlyGross: parseFloat((gross / 12).toFixed(2)),
      monthlyNet:   parseFloat((gross * (1 - taxRate) / 12).toFixed(2)),
    };
  });
}

// ── Score rischio ─────────────────────────────────────────────────────────────

export function riskScore(positions, prices = {}) {
  let score = 100;
  const alerts = [];
  if (!positions.length) return { score: 100, alerts: [] };

  const totalValue = positions.reduce((s, p) => s + marketValue(p, prices), 0);
  const totalGross = positions.reduce((s, p) => s + annualGross(p), 0);

  positions.forEach(p => {
    const w = totalValue > 0 ? marketValue(p, prices) / totalValue * 100 : 0;
    if (w > 20)  { score -= 15; alerts.push({ severity: 'critical', ticker: p.ticker, msg: `${p.ticker} supera il 20% del portafoglio` }); }
    else if (w > 15) { score -= 5; alerts.push({ severity: 'warning', ticker: p.ticker, msg: `${p.ticker} supera il 15%` }); }
    if ((p.payoutRatio || 0) > 100) { score -= 15; alerts.push({ severity: 'critical', ticker: p.ticker, msg: `${p.ticker}: dividendo non coperto dagli utili` }); }
    else if ((p.payoutRatio || 0) > 80) { score -= 5; alerts.push({ severity: 'warning', ticker: p.ticker, msg: `${p.ticker}: payout ratio elevato (${p.payoutRatio}%)` }); }
    if (!p.moatRating || p.moatRating === 'None') { score -= 15; alerts.push({ severity: 'critical', ticker: p.ticker, msg: `${p.ticker}: nessun moat identificabile` }); }
    if ((p.consecutiveDividendYears || 0) < 10) { score -= 2; alerts.push({ severity: 'info', ticker: p.ticker, msg: `${p.ticker}: meno di 10 anni di storia dividendi` }); }
  });

  const sorted = [...positions].sort((a, b) => annualGross(b) - annualGross(a));
  const top3   = sorted.slice(0, 3).reduce((s, p) => s + annualGross(p), 0);
  if (totalGross > 0 && (top3 / totalGross) > 0.5) {
    score -= 5;
    alerts.push({ severity: 'warning', ticker: '—', msg: 'I top 3 titoli generano oltre il 50% dei dividendi' });
  }

  const yieldPct = totalValue > 0 ? (totalGross / totalValue) * 100 : 0;
  if (yieldPct > 7) {
    score -= 5;
    alerts.push({ severity: 'warning', ticker: '—', msg: `Yield medio ${yieldPct.toFixed(1)}% — verifica yield trap` });
  }

  return { score: Math.max(0, score), alerts };
}
