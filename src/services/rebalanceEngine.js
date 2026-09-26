/**
 * Motore di ribilanciamento.
 *
 * Estratto da Rebalancing.jsx senza cambiarne il comportamento: le stesse
 * funzioni, gli stessi risultati. Ora sono importabili anche dalla modalità
 * guidata (GUIDED_MODE_SPEC §5.5) e coperte da test.
 *
 * Tutte le funzioni sono pure: le letture da localStorage (strategia, data
 * dell'ultimo ribilanciamento) restano a carico del chiamante.
 */

import { format, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { getMicroFromTicker } from '../config/assetTickerMapping';

const UNDERWEIGHT_THRESHOLD = -2;   // punti % sotto target per considerare un acquisto
const ALERT_THRESHOLD = 5;          // punti % di scostamento che generano un alert

/** Scostamento per macro asset class rispetto ai target di strategia. */
export function calculateDeviation(holdings, strategyData) {
  const investableHoldings = holdings.filter(h => !h.isCash);
  const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

  const categoryTotals = {};
  investableHoldings.forEach(h => {
    const category = h.macroCategory || h.category;
    categoryTotals[category] = (categoryTotals[category] || 0) + (h.marketValue || 0);
  });

  const assetClasses = Object.keys(strategyData.assetAllocation);
  return assetClasses.map(assetClass => {
    const currentValue = categoryTotals[assetClass] || 0;
    const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
    const targetPercentage = strategyData.assetAllocation[assetClass];
    const difference = currentPercentage - targetPercentage;
    const amountDifference = totalValue * (difference / 100);

    return {
      assetClass,
      current: parseFloat(currentPercentage.toFixed(2)),
      target: parseFloat(targetPercentage),
      difference: parseFloat(difference.toFixed(2)),
      amountDifference: parseFloat(amountDifference.toFixed(2)),
      status: Math.abs(difference) < 2 ? 'ok' : Math.abs(difference) < 5 ? 'warning' : 'alert',
    };
  }).filter(d => d.target > 0);
}

/**
 * Scostamento per micro-categoria.
 * NB: restituisce anche classi Tailwind (`statusColor`) — eredità
 * dell'estrazione, da ripulire quando la pagina passerà al design system.
 */
export function calculateMicroDeviation(holdings, strategy) {
  const investableHoldings = holdings.filter(h => !h.isCash);
  const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

  const tickerData = {};
  investableHoldings.forEach(h => {
    const key = h.ticker;
    if (!tickerData[key]) {
      const mappedMicro = getMicroFromTicker(h.ticker);
      tickerData[key] = {
        ticker: h.ticker,
        name: h.name || h.ticker,
        microCategory: mappedMicro || h.microCategory || h.subCategory || 'Non categorizzato',
        macroCategory: h.macroCategory || h.category,
        value: 0,
        currentPrice: h.currentPrice,
        quantity: 0,
      };
    }
    tickerData[key].value += h.marketValue || 0;
    tickerData[key].quantity += h.quantity || 0;
  });

  const hasStrategyTargets = strategy && strategy.microAllocation
    && Object.keys(strategy.microAllocation).length > 0;
  const microTargets = hasStrategyTargets ? strategy.microAllocation : {};

  const microTotals = {};
  Object.values(tickerData).forEach(t => {
    const micro = t.microCategory;
    if (!microTotals[micro]) microTotals[micro] = { microCategory: micro, value: 0, tickers: [] };
    microTotals[micro].value += t.value;
    microTotals[micro].tickers.push(t);
  });

  const allMicroCategories = new Set([
    ...Object.keys(microTotals),
    ...Object.keys(microTargets),
  ]);

  return Array.from(allMicroCategories).map(microCategory => {
    const data = microTotals[microCategory] || { value: 0, tickers: [] };
    const value = data.value;
    const currentPercentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
    const targetPercentage = microTargets[microCategory] || 0;
    const difference = currentPercentage - targetPercentage;

    let status = 'ok';
    let statusLabel = '✓ OK';
    let statusColor = 'bg-success-100 text-success-700';
    let actionNote = '';

    if (targetPercentage === 0 && value > 0) {
      status = 'out_of_strategy';
      statusLabel = '🟡 Non in strategia';
      statusColor = 'bg-yellow-100 text-yellow-700';
      actionNote = 'Considera vendita graduale o mantenimento';
    } else if (Math.abs(difference) >= 10) {
      status = 'alert';
      statusLabel = difference > 0 ? '🔴 Vendere' : '🟢 Comprare';
      statusColor = difference > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
    } else if (Math.abs(difference) >= 5) {
      status = 'warning';
      statusLabel = '⚠ Attenzione';
      statusColor = 'bg-orange-100 text-orange-700';
    }

    return {
      microCategory,
      current: parseFloat(currentPercentage.toFixed(2)),
      target: parseFloat(targetPercentage.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      value,
      tickers: data.tickers || [],
      status,
      statusLabel,
      statusColor,
      actionNote,
      hasTarget: targetPercentage > 0,
      isOutOfStrategy: targetPercentage === 0 && value > 0,
    };
  })
    .filter(d => d.current > 0 || d.target > 0)
    .sort((a, b) => {
      if (a.isOutOfStrategy && !b.isOutOfStrategy) return -1;
      if (!a.isOutOfStrategy && b.isOutOfStrategy) return 1;
      return b.value - a.value;
    });
}

/**
 * Calendario 12 mesi con acquisti a quote intere: il resto non speso si
 * accumula sul mese successivo.
 */
export function calculate12MonthWholeUnitCalendar(portfolio, strategy, budget, now = new Date()) {
  if (budget <= 0 || !strategy.microAllocation) return [];

  const investableHoldings = portfolio.filter(h => !h.isCash);

  const tickerInfo = {};
  investableHoldings.forEach(h => {
    if (!tickerInfo[h.ticker]) {
      const mappedMicro = getMicroFromTicker(h.ticker);
      tickerInfo[h.ticker] = {
        ticker: h.ticker,
        name: h.name || h.ticker,
        microCategory: mappedMicro || h.microCategory || h.subCategory,
        macroCategory: h.macroCategory || h.category,
        currentPrice: h.currentPrice || h.avgPrice,
        quantity: h.quantity,
      };
    }
  });

  const microToTickers = {};
  Object.values(tickerInfo).forEach(t => {
    const micro = t.microCategory;
    if (micro && strategy.microAllocation[micro] !== undefined) {
      if (!microToTickers[micro]) microToTickers[micro] = [];
      microToTickers[micro].push(t);
    }
  });

  const tickerTargets = [];
  Object.entries(strategy.microAllocation).forEach(([micro, targetPct]) => {
    if (targetPct > 0) {
      const tickers = microToTickers[micro] || [];
      if (tickers.length > 0) {
        const pctPerTicker = targetPct / tickers.length;
        tickers.forEach(t => {
          tickerTargets.push({
            ticker: t.ticker,
            name: t.name,
            targetPct: pctPerTicker,
            price: t.currentPrice,
            microCategory: micro,
          });
        });
      }
    }
  });

  if (tickerTargets.length === 0) return [];

  const calendar = [];
  let accumulatedRemainder = 0;

  for (let month = 1; month <= 12; month++) {
    const date = addMonths(now, month);
    const effectiveBudget = budget + accumulatedRemainder;

    const purchases = [];
    let totalSpent = 0;

    const tickerPurchases = tickerTargets.map(t => {
      const idealAmount = effectiveBudget * (t.targetPct / 100);
      const wholeUnits = Math.floor(idealAmount / t.price);
      const actualAmount = wholeUnits * t.price;
      return { ...t, idealAmount, wholeUnits, actualAmount, remainder: idealAmount - actualAmount };
    }).filter(p => p.wholeUnits > 0);

    tickerPurchases.sort((a, b) => b.remainder - a.remainder);

    tickerPurchases.forEach(p => {
      purchases.push({
        ticker: p.ticker,
        name: p.name,
        microCategory: p.microCategory,
        units: p.wholeUnits,
        price: p.price,
        amount: p.actualAmount,
      });
      totalSpent += p.actualAmount;
    });

    const remainder = effectiveBudget - totalSpent;
    accumulatedRemainder = remainder;

    calendar.push({
      month: format(date, 'MMM yyyy', { locale: it }),
      monthFull: format(date, 'MMMM yyyy', { locale: it }),
      monthNumber: month,
      budget: effectiveBudget,
      purchases,
      totalSpent,
      remainder,
      utilizationPercent: effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0,
    });
  }

  return calendar;
}

/**
 * Come distribuire il prossimo versamento.
 * NB: la forma del risultato cambia — array se `fractional`, oggetto con
 * {purchases, spent, remaining} se a quote intere con classi sottopesate.
 * Comportamento originale mantenuto; i chiamanti controllano con Array.isArray.
 */
export function calculateSmartPurchases(portfolio, deviations, budget, fractional) {
  if (fractional) {
    const underweight = deviations.filter(d => d.difference < UNDERWEIGHT_THRESHOLD);
    const totalUnderweight = underweight.reduce((sum, d) => sum + Math.abs(d.difference), 0);

    return underweight.map(d => ({
      assetClass: d.assetClass,
      amount: totalUnderweight > 0
        ? parseFloat((budget * (Math.abs(d.difference) / totalUnderweight)).toFixed(2))
        : 0,
      percentageOfBudget: totalUnderweight > 0
        ? parseFloat(((Math.abs(d.difference) / totalUnderweight) * 100).toFixed(1))
        : 0,
      shares: null,
    }));
  }

  const holdings = portfolio.filter(h => !h.isCash);
  const underweight = deviations.filter(d => d.difference < UNDERWEIGHT_THRESHOLD);

  if (underweight.length === 0) {
    return deviations
      .filter(d => d.target > 0)
      .map(d => {
        const holdingsInClass = holdings.filter(h => (h.macroCategory || h.category) === d.assetClass);
        const avgPrice = holdingsInClass.length > 0
          ? holdingsInClass.reduce((sum, h) => sum + h.currentPrice, 0) / holdingsInClass.length
          : 100;

        const targetAmount = budget * (d.target / 100);
        const shares = Math.floor(targetAmount / avgPrice);
        const actualAmount = shares * avgPrice;

        return {
          assetClass: d.assetClass,
          price: parseFloat(avgPrice.toFixed(2)),
          shares,
          amount: parseFloat(actualAmount.toFixed(2)),
          percentageOfBudget: budget > 0 ? parseFloat(((actualAmount / budget) * 100).toFixed(1)) : 0,
        };
      })
      .filter(p => p.shares > 0);
  }

  const totalUnderweight = underweight.reduce((sum, d) => sum + Math.abs(d.difference), 0);

  const purchases = underweight.map(d => {
    const holdingsInClass = holdings.filter(h => (h.macroCategory || h.category) === d.assetClass);
    const avgPrice = holdingsInClass.length > 0
      ? holdingsInClass.reduce((sum, h) => sum + h.currentPrice, 0) / holdingsInClass.length
      : 50;

    const targetAmount = budget * (Math.abs(d.difference) / totalUnderweight);
    const shares = Math.floor(targetAmount / avgPrice);
    const actualAmount = shares * avgPrice;

    return {
      assetClass: d.assetClass,
      price: parseFloat(avgPrice.toFixed(2)),
      shares,
      amount: parseFloat(actualAmount.toFixed(2)),
      percentageOfBudget: budget > 0 ? parseFloat(((actualAmount / budget) * 100).toFixed(1)) : 0,
      remaining: parseFloat((targetAmount - actualAmount).toFixed(2)),
    };
  }).filter(p => p.shares > 0);

  const spent = purchases.reduce((sum, p) => sum + p.amount, 0);
  const remaining = budget - spent;

  return {
    purchases,
    spent: parseFloat(spent.toFixed(2)),
    remaining: parseFloat(remaining.toFixed(2)),
    utilizationPercent: budget > 0 ? parseFloat(((spent / budget) * 100).toFixed(1)) : 0,
  };
}

/** Calendario PAC a 6 mesi: priorità alle classi sottopesate. */
export function calculatePACCalendar(deviations, strategyData, now = new Date()) {
  const monthlyAmount = parseFloat(strategyData.monthlyInvestment) || 0;
  if (monthlyAmount === 0) return [];

  const calendar = [];
  const needsRebalancing = deviations.filter(d => d.difference < UNDERWEIGHT_THRESHOLD);

  for (let month = 1; month <= 12; month++) {
    const date = addMonths(now, month);
    const purchases = [];

    const totalUnderweight = needsRebalancing.reduce((sum, d) => sum + Math.abs(d.difference), 0);

    if (totalUnderweight > 0) {
      needsRebalancing.forEach(d => {
        const amount = monthlyAmount * (Math.abs(d.difference) / totalUnderweight);
        if (amount >= 10) {
          purchases.push({ assetClass: d.assetClass, amount: parseFloat(amount.toFixed(2)) });
        }
      });
    } else {
      deviations.forEach(d => {
        const amount = monthlyAmount * (d.target / 100);
        if (amount >= 10) {
          purchases.push({ assetClass: d.assetClass, amount: parseFloat(amount.toFixed(2)) });
        }
      });
    }

    calendar.push({
      month: format(date, 'MMM yyyy', { locale: it }),
      monthNumber: month,
      purchases,
      total: purchases.reduce((sum, p) => sum + p.amount, 0),
    });
  }

  return calendar.slice(0, 6);
}

/** Quanto servirebbe versare in un colpo solo per riportare ogni classe a target. */
export function calculatePICAmounts(deviations, holdings) {
  const investableHoldings = holdings.filter(h => !h.isCash);
  const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

  return deviations
    .filter(d => d.difference < -1)
    .map(d => {
      const targetValue = totalValue * (d.target / 100);
      const currentValue = totalValue * (d.current / 100);

      return {
        assetClass: d.assetClass,
        currentValue: parseFloat(currentValue.toFixed(2)),
        targetValue: parseFloat(targetValue.toFixed(2)),
        amountNeeded: parseFloat((targetValue - currentValue).toFixed(2)),
        currentPercentage: d.current,
        targetPercentage: d.target,
      };
    })
    .sort((a, b) => b.amountNeeded - a.amountNeeded);
}

/**
 * @param {Array}  deviations
 * @param {string|null} lastRebalancingDate  ISO, letta dal chiamante
 */
export function checkRebalancingAlerts(deviations, lastRebalancingDate, now = new Date()) {
  const alerts = [];

  const significantDeviations = deviations.filter(d => Math.abs(d.difference) >= ALERT_THRESHOLD);
  if (significantDeviations.length > 0) {
    alerts.push({
      type: 'deviation',
      severity: 'high',
      title: 'Scostamento Significativo Rilevato',
      message: `${significantDeviations.length} asset class ${significantDeviations.length > 1 ? 'hanno' : 'ha'} uno scostamento ≥5% dall'obiettivo`,
      assets: significantDeviations.map(d => d.assetClass).join(', '),
    });
  }

  if (lastRebalancingDate) {
    const monthsSince = Math.floor((now - new Date(lastRebalancingDate)) / (1000 * 60 * 60 * 24 * 30));
    if (monthsSince >= 12) {
      alerts.push({
        type: 'time',
        severity: 'medium',
        title: 'Ribilanciamento Annuale Consigliato',
        message: `Sono passati ${monthsSince} mesi dall'ultimo ribilanciamento. Si consiglia un ribilanciamento annuale.`,
      });
    } else if (monthsSince >= 6 && significantDeviations.length > 0) {
      alerts.push({
        type: 'time',
        severity: 'medium',
        title: 'Ribilanciamento Semestrale Consigliato',
        message: `Sono passati ${monthsSince} mesi dall'ultimo ribilanciamento e sono presenti scostamenti significativi.`,
      });
    }
  }

  return alerts;
}
