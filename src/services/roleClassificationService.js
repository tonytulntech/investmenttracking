/**
 * Role Classification Service
 *
 * Suggerisce automaticamente il "Ruolo" (bucket) di un titolo dentro il suo
 * portafoglio, SENZA API esterne: usa i dati già presenti nel progetto
 * (STOCK_DB per le azioni, classifyHolding/assetClasses per gli ETF, crypto).
 *
 * Output = match col NOME dei bucket esistenti del portafoglio (i preset usano
 * nomi standard tipo "REIT", "Growth Dividend", "Momentum", "Tech / Software"…).
 */

import { STOCK_DB } from '../data/stockDividendData';
import { classifyHolding } from './classificationService';
import { isCrypto } from './coinGecko';
import { BUCKET_ROLE_PRESETS } from './portfolioConfigService';

const ALL_PRESET_ROLES = BUCKET_ROLE_PRESETS.flatMap(g => g.roles);

const baseTicker = (t) => (t || '').split('.')[0].split('-')[0].toUpperCase();

// normalizza per il matching: minuscolo, senza accenti/punteggiatura
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Espande una label micro/settore in una lista di "hint" (parole chiave). */
function labelToHints(label) {
  const n = norm(label);
  if (!n) return [];
  const hints = [n];
  const add = (...xs) => xs.forEach(x => hints.push(x));
  // Fattori
  if (n.includes('momentum')) add('momentum');
  if (n.includes('quality') || n.includes('qualita')) add('quality');
  if (n.includes('value')) add('value');
  if (n.includes('small') || n.includes('size')) add('size', 'small cap');
  if (n.includes('beta basso') || n.includes('low vol') || n.includes('minimum vol')) add('low volatility');
  if (n.includes('multi')) add('multi factor');
  // Dividendo
  if (n.includes('dividend')) add('dividend', 'income', 'high yield');
  // Geografie
  if (n.includes('mondiale') || n.includes('world') || n.includes('sviluppat')) add('world', 'sviluppati', 'developed');
  if (n.includes('emergent')) add('emergenti', 'emerging');
  if (n.includes('usa') || n.includes('americ') || n.includes('s&p') || n.includes('500')) add('usa', 'stati uniti');
  if (n.includes('europa') || n.includes('europe')) add('europa');
  if (n.includes('giappon') || n.includes('japan')) add('giappone');
  if (n.includes('asia') || n.includes('pacific')) add('asia', 'pacifico');
  // Settori / temi
  if (n.includes('tech') || n.includes('software') || n.includes('information')) add('tech', 'software');
  if (n.includes('semic') || n.includes('semiconduct')) add('semiconduttori', 'semiconductor');
  if (n.includes('health') || n.includes('pharma') || n.includes('salute')) add('health', 'pharma');
  if (n.includes('financ')) add('financials', 'financial');
  if (n.includes('energy') || n.includes('energia')) add('energy');
  if (n.includes('utilit')) add('utilities');
  if (n.includes('material')) add('materials');
  if (n.includes('industr')) add('industrials');
  if (n.includes('staples') || n.includes('difensiv')) add('consumer staples', 'staples');
  if (n.includes('discretionary') || n.includes('ciclic')) add('consumer discretionary', 'discretionary');
  if (n.includes('real estate') || n.includes('immobil') || n.includes('reit')) add('reit', 'real estate');
  if (n.includes('water') || n.includes('acqua')) add('water');
  if (n.includes('rame') || n.includes('copper')) add('rame', 'copper');
  if (n.includes('robot') || n.includes('automation')) add('robotics', 'automation');
  if (n.includes('cyber') || n.includes('security')) add('cybersecurity');
  if (n.includes('clean') || n.includes('rinnov') || n.includes('solar')) add('clean energy');
  if (n.includes('biotech')) add('biotech');
  if (n.includes('uranio') || n.includes('uranium') || n.includes('nucleare')) add('uranio', 'uranium');
  // Altre asset class
  if (n.includes('oro') || n.includes('gold')) add('oro', 'gold');
  if (n.includes('obbligaz') || n.includes('bond') || n.includes('govern') || n.includes('treasur') || n.includes('aggregate')) add('obbligazionario', 'bond');
  if (n.includes('liquidit') || n.includes('cash') || n.includes('money market')) add('liquidita', 'cash');
  return hints;
}

/** Ricava i concept-tag / hint di un titolo dalle sorgenti dati locali. */
export function getConceptTags(holding = {}) {
  const ticker = holding.ticker || holding.holdingKey || '';
  const bt = baseTicker(ticker);

  // 1) Crypto
  if (isCrypto?.(bt) || holding.macroCategory === 'Crypto' || holding.isCrypto) {
    if (bt === 'BTC' || bt === 'XBT') return { hints: ['bitcoin', 'store of value', 'crypto'], assetClass: 'crypto' };
    if (bt === 'ETH') return { hints: ['ethereum', 'smart contract', 'crypto'], assetClass: 'crypto' };
    return { hints: ['altcoin', 'crypto'], assetClass: 'crypto' };
  }

  // 2) Azione singola in STOCK_DB (la fonte più ricca: settore, REIT/BDC, kings, growth)
  const s = STOCK_DB[bt];
  if (s) {
    const hints = [];
    const at = norm(s.assetType);
    const sec = norm(s.sector);
    const years = s.consecutiveDividendYears || 0;
    const growth = s.dividendGrowthRate || 0;
    const lynch = norm(s.lynchCategory);

    if (at.includes('reit') || sec.includes('real estate')) hints.push('reit', 'real estate', 'income', 'high yield');
    if (at.includes('bdc')) hints.push('bdc', 'alternative credit', 'income', 'high yield');
    if (years >= 25) hints.push('kings', 'aristocrat', 'dividend kings');
    if (growth >= 7 || lynch.includes('grower') || lynch.includes('fast')) hints.push('growth dividend', 'growth');
    // settore sempre come fallback
    hints.push(...labelToHints(s.sector));
    return { hints, assetClass: 'equity', sector: s.sector, geography: s.geography };
  }

  // 3) ETF / resto → label micro da classifyHolding
  try {
    const c = classifyHolding(holding);
    if (c?.microLabel) return { hints: labelToHints(c.microLabel), assetClass: c.macroKey };
  } catch { /* noop */ }

  // 4) fallback: prova col nome esteso
  return { hints: labelToHints(holding.name || ''), assetClass: null };
}

/**
 * Suggerisce il bucketId migliore per un titolo tra i bucket del portafoglio.
 * Match per keyword sul NOME del bucket; ritorna null se sotto soglia di confidenza.
 */
export function suggestBucketId(holding, buckets = []) {
  const { hints } = getConceptTags(holding);
  if (!hints.length || !buckets.length) return null;

  let bestId = null;
  let bestScore = 0;
  for (const b of buckets) {
    const name = norm(b.name);
    if (!name) continue;
    let score = 0;
    for (const h of hints) {
      const hn = norm(h);
      if (!hn) continue;
      if (name.includes(hn) || hn.includes(name)) score += hn.length >= 4 ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; bestId = b.id; }
  }
  return bestScore >= 2 ? bestId : null;
}

/**
 * Calcola i suggerimenti per una lista di titoli (match sui bucket esistenti).
 * @returns { [holdingKey]: bucketId }  solo per i match sopra soglia
 */
export function suggestAssignments(holdings = [], buckets = []) {
  const out = {};
  holdings.forEach(h => {
    const key = h.holdingKey || h.ticker;
    const id = suggestBucketId(h, buckets);
    if (id) out[key] = id;
  });
  return out;
}

/**
 * Suggerisce il NOME di ruolo canonico (dai preset) per un titolo, a prescindere
 * dai bucket già creati. Usato per l'auto-classificazione che crea i ruoli al volo.
 * @returns string | null
 */
export function suggestRoleName(holding) {
  const { hints } = getConceptTags(holding);
  if (!hints.length) return null;

  let best = null;
  let bestScore = 0;
  for (const name of ALL_PRESET_ROLES) {
    const nn = norm(name);
    let score = 0;
    for (const h of hints) {
      const hn = norm(h);
      if (!hn) continue;
      if (nn.includes(hn) || hn.includes(nn)) score += hn.length >= 4 ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return bestScore >= 2 ? best : null;
}
