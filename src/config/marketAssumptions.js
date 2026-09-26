/**
 * Ipotesi di mercato per le proiezioni della modalità guidata.
 *
 * ⚠️ TODO — VALORI PLACEHOLDER, DA DECIDERE PRIMA DELLA FASE 3.
 * Nessuno dei numeri qui sotto è stato validato: servono solo a far girare il
 * Monte Carlo e i test. Vanno sostituiti con le ipotesi scelte da Tony, con
 * l'indicazione della fonte e della data.
 *
 * Convenzioni: rendimenti e volatilità ANNUI NOMINALI, in punti percentuali,
 * al lordo di tasse e costi. L'inflazione è tenuta separata: le proiezioni
 * della spec sono in valore nominale (§2.2 targetAmount).
 */

import { BUCKET_KEYS } from './buckets';

/** @type {{ source: string, updatedAt: string|null, validated: boolean }} */
export const ASSUMPTIONS_META = {
  source: 'TODO — placeholder non validati',
  updatedAt: null,
  validated: false,
};

/** TODO: rendimento atteso annuo nominale, % */
export const EXPECTED_RETURN = {
  equity:     7.0,
  bondShort:  2.5,
  bondMedium: 3.2,
  cash:       2.0,
  gold:       3.0,
};

/** TODO: volatilità annua, % */
export const VOLATILITY = {
  equity:     17.0,
  bondShort:   2.0,
  bondMedium:  6.0,
  cash:        0.5,
  gold:       15.0,
};

/**
 * TODO: matrice di correlazione fra i bucket.
 * Simmetrica, diagonale = 1. Definita per metà e completata da `correlation()`.
 */
export const CORRELATION = {
  equity:     { equity: 1,    bondShort: 0.00, bondMedium: 0.10, cash: 0.00, gold: 0.05 },
  bondShort:  { bondShort: 1, bondMedium: 0.75, cash: 0.30, gold: 0.10 },
  bondMedium: { bondMedium: 1, cash: 0.10, gold: 0.20 },
  cash:       { cash: 1, gold: 0.00 },
  gold:       { gold: 1 },
};

/** Correlazione fra due bucket, indipendente dall'ordine. */
export function correlation(a, b) {
  if (a === b) return 1;
  const value = CORRELATION[a]?.[b] ?? CORRELATION[b]?.[a];
  if (value === undefined) {
    throw new Error(`Correlazione non definita per ${a}/${b}`);
  }
  return value;
}

/**
 * Riduce un'allocazione per bucket a rendimento atteso e volatilità del
 * portafoglio nel suo insieme, usando la matrice di correlazione:
 *   μ = Σ wᵢ·rᵢ            σ² = Σᵢ Σⱼ wᵢ·wⱼ·σᵢ·σⱼ·ρᵢⱼ
 *
 * È questo il punto in cui le correlazioni entrano nel Monte Carlo: si simula
 * una serie aggregata, non cinque serie correlate. Basta per stimare la
 * probabilità di raggiungere un obiettivo ed è molto più veloce.
 *
 * @param   {Object} allocation  { equity: 60, bondShort: 10, ... } in %
 * @returns {{ expectedReturn: number, volatility: number }} in % annui
 */
export function portfolioAssumptions(allocation) {
  const total = BUCKET_KEYS.reduce((s, k) => s + (allocation?.[k] ?? 0), 0);
  if (total <= 0) return { expectedReturn: 0, volatility: 0 };

  const w = Object.fromEntries(BUCKET_KEYS.map(k => [k, (allocation?.[k] ?? 0) / total]));

  const expectedReturn = BUCKET_KEYS.reduce((s, k) => s + w[k] * EXPECTED_RETURN[k], 0);

  let variance = 0;
  BUCKET_KEYS.forEach(i => {
    BUCKET_KEYS.forEach(j => {
      variance += w[i] * w[j] * VOLATILITY[i] * VOLATILITY[j] * correlation(i, j);
    });
  });

  return {
    expectedReturn: Math.round(expectedReturn * 100) / 100,
    volatility: Math.round(Math.sqrt(Math.max(0, variance)) * 100) / 100,
  };
}
