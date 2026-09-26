/**
 * Bucket della modalità guidata (GUIDED_MODE_SPEC §3).
 *
 * Sono più granulari delle MACRO_CATEGORIES usate dal resto dell'app: il glide
 * path distingue bond breve da bond medio, che per le macro-categorie sono
 * entrambi 'bond'. Questo file è il layer di traduzione — le MACRO_CATEGORIES
 * in portfolioConfigService restano intatte.
 */

export const BUCKETS = [
  { key: 'equity',     label: 'Azionario',        macro: 'equity',    color: '#0A84FF' },
  { key: 'bondShort',  label: 'Bond breve 1-3',   macro: 'bond',      color: '#30D158' },
  { key: 'bondMedium', label: 'Bond medio 7-10',  macro: 'bond',      color: '#28A745' },
  { key: 'cash',       label: 'Liquidità',        macro: 'cash',      color: '#32ADE6' },
  { key: 'gold',       label: 'Oro',              macro: 'commodity', color: '#FF9F0A' },
];

export const BUCKET_KEYS = BUCKETS.map(b => b.key);

export const BUCKET_TO_MACRO = Object.fromEntries(BUCKETS.map(b => [b.key, b.macro]));

export function getBucket(key) {
  return BUCKETS.find(b => b.key === key) || null;
}

/** Allocazione vuota, tutti i bucket a 0. */
export function emptyBucketAllocation() {
  return Object.fromEntries(BUCKET_KEYS.map(k => [k, 0]));
}

/**
 * Traduce un'allocazione per bucket nelle MACRO_CATEGORIES esistenti,
 * sommando i bucket che ricadono nella stessa macro (bondShort + bondMedium).
 *
 * @param   {Object} allocation  { equity: 60, bondShort: 10, ... }
 * @returns {Object}             { equity: 60, bond: 30, commodity: 0, cash: 10, ... }
 */
export function bucketsToMacro(allocation) {
  const macro = { equity: 0, bond: 0, commodity: 0, realEstate: 0, crypto: 0, cash: 0 };
  BUCKET_KEYS.forEach(key => {
    macro[BUCKET_TO_MACRO[key]] += allocation?.[key] ?? 0;
  });
  return macro;
}

/**
 * Normalizza un'allocazione perché sommi esattamente a 100, distribuendo il
 * resto sul bucket col peso maggiore per evitare derive da arrotondamento.
 */
export function normalizeAllocation(allocation) {
  const result = emptyBucketAllocation();
  BUCKET_KEYS.forEach(k => { result[k] = Math.max(0, allocation?.[k] ?? 0); });

  const total = BUCKET_KEYS.reduce((s, k) => s + result[k], 0);
  if (total === 0) return result;

  BUCKET_KEYS.forEach(k => { result[k] = Math.round((result[k] / total) * 1000) / 10; });

  const drift = 100 - BUCKET_KEYS.reduce((s, k) => s + result[k], 0);
  if (drift !== 0) {
    const largest = BUCKET_KEYS.reduce((a, b) => (result[a] >= result[b] ? a : b));
    result[largest] = Math.round((result[largest] + drift) * 10) / 10;
  }
  return result;
}
