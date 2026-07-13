/**
 * ETF Composition Database
 * Dati statici di composizione per ETF comuni — aggiornati maggio 2026.
 * Fonti: MSCI, FTSE Russell, Bloomberg, provider ETF.
 *
 * Portato da qualeetf/web-app/lib/etf-composition.ts
 * con aggiunta dei dati settoriali per analisi portafoglio.
 *
 * Nuovi campi (maggio 2026):
 *   assetType   – 'equity' | 'bond' | 'commodity' | 'crypto' | 'multi-asset' | 'money-market' | 'real-estate'
 *   marketType  – [{type, pct}]  sviluppati vs emergenti
 *   area        – [{name, pct}]  macro-aree geografiche
 *   factors     – {value,growth,momentum,quality,size,lowVol,yield}  scala -2→+2  (solo equity)
 *   bondInfo    – {duration,ytm,creditRating,type}  (solo bond/money-market)
 *   numHoldings – numero approssimativo di titoli in portafoglio
 */

// ── Profili di composizione per indice ──────────────────────────────────────

const PROFILES = {

  msci_world: {
    assetType: 'equity',
    numHoldings: 1308,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 74.8 },
      { name: 'Europa',       pct: 15.9 },
      { name: 'Giappone',     pct: 5.6  },
      { name: 'Asia Pacifico',pct: 1.7  },
      { name: 'Altro',        pct: 2.0  },
    ],
    factors: { value: -0.2, growth: 0.3, momentum: 0.1, quality: 0.3, size: -0.3, lowVol: -0.1, yield: -0.2 },
    geography: [
      { country: "Stati Uniti",   pct: 70.5 },
      { country: "Giappone",      pct: 5.7  },
      { country: "Regno Unito",   pct: 3.8  },
      { country: "Canada",        pct: 3.0  },
      { country: "Francia",       pct: 2.8  },
      { country: "Svizzera",      pct: 2.5  },
      { country: "Germania",      pct: 2.2  },
      { country: "Australia",     pct: 1.8  },
      { country: "Paesi Bassi",   pct: 1.4  },
      { country: "Danimarca",     pct: 1.1  },
      { country: "Svezia",        pct: 1.1  },
      { country: "Hong Kong",     pct: 0.9  },
      { country: "Spagna",        pct: 0.8  },
      { country: "Italia",        pct: 0.7  },
      { country: "Singapore",     pct: 0.5  },
      { country: "Norvegia",      pct: 0.3  },
      { country: "Belgio",        pct: 0.3  },
      { country: "Finlandia",     pct: 0.3  },
      { country: "Altri minori",  pct: 0.3  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',         pct: 71.3 },
      { code: 'EUR', name: 'Euro',                pct: 11.0 },
      { code: 'JPY', name: 'Yen giapponese',      pct: 5.6  },
      { code: 'GBP', name: 'Sterlina',            pct: 3.8  },
      { code: 'CAD', name: 'Dollaro canadese',    pct: 3.5  },
      { code: 'CHF', name: 'Franco svizzero',     pct: 2.3  },
      { code: 'AUD', name: 'Dollaro australiano', pct: 1.7  },
      { code: 'DKK', name: 'Corona danese',       pct: 1.3  },
      { code: 'Altri', name: 'Altri',             pct: 0.5  },
    ],
    sectors: [
      { name: "Tecnologia", pct: 29.9 },
      { name: "Finanza", pct: 15.1 },
      { name: "Industria", pct: 11.3 },
      { name: "Consumi discrezionali", pct: 9.3 },
      { name: "Communication", pct: 8.8 },
      { name: "Sanit\u00e0", pct: 8.6 },
      { name: "Beni di consumo", pct: 5.0 },
      { name: "Energia", pct: 3.8 },
      { name: "Materiali", pct: 3.4 },
      { name: "Utility", pct: 2.4 },
      { name: "Immobiliare", pct: 1.7 }
    ],
    topHoldings: [
      { name: "NVIDIA CORP", pct: 5.71 },
      { name: "APPLE INC", pct: 5.04 },
      { name: "MICROSOFT CORP", pct: 3.31 },
      { name: "AMAZON.COM INC", pct: 2.89 },
      { name: "ALPHABET INC CLASS A", pct: 2.49 },
      { name: "BROADCOM INC", pct: 2.11 },
      { name: "ALPHABET INC CLASS C", pct: 2.06 },
      { name: "META PLATFORMS INC CLASS A", pct: 1.52 },
      { name: "TESLA INC", pct: 1.37 },
      { name: "MICRON TECHNOLOGY INC", pct: 1.13 }
    ],
  },

  ftse_all_world: {
    assetType: 'equity',
    numHoldings: 3700,
    marketType: [
      { type: 'Mercati sviluppati', pct: 90.2 },
      { type: 'Mercati emergenti',  pct: 9.8  },
    ],
    area: [
      { name: 'Nord America',       pct: 66.4 },
      { name: 'Europa',             pct: 14.2 },
      { name: 'Asia Pacifico',      pct: 7.5  },
      { name: 'Mercati Emergenti',  pct: 11.9 },
    ],
    factors: { value: 0.0, growth: 0.1, momentum: 0.0, quality: 0.1, size: -0.1, lowVol: 0.0, yield: 0.0 },
    geography: [
      { country: 'Stati Uniti',    pct: 63.5 },
      { country: 'Giappone',       pct: 5.0  },
      { country: 'Cina',           pct: 3.4  },
      { country: 'Regno Unito',    pct: 3.4  },
      { country: 'Canada',         pct: 2.9  },
      { country: 'India',          pct: 2.2  },
      { country: 'Francia',        pct: 2.1  },
      { country: 'Svizzera',       pct: 2.0  },
      { country: 'Germania',       pct: 1.9  },
      { country: 'Taiwan',         pct: 1.9  },
      { country: 'Australia',      pct: 2.0  },
      { country: 'Corea del Sud',  pct: 1.5  },
      { country: 'Svezia',         pct: 0.9  },
      { country: 'Paesi Bassi',    pct: 0.8  },
      { country: 'Danimarca',      pct: 0.6  },
      { country: 'Hong Kong',      pct: 0.6  },
      { country: 'Spagna',         pct: 0.6  },
      { country: 'Italia',         pct: 0.5  },
      { country: 'Singapore',      pct: 0.4  },
      { country: 'Brasile',        pct: 0.4  },
      { country: 'Arabia Saudita', pct: 0.4  },
      { country: 'Norvegia',       pct: 0.3  },
      { country: 'Belgio',         pct: 0.2  },
      { country: 'Finlandia',      pct: 0.2  },
      { country: 'Altri minori',   pct: 1.2  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',         pct: 63.5 },
      { code: 'EUR', name: 'Euro',                pct: 9.5  },
      { code: 'JPY', name: 'Yen giapponese',      pct: 5.0  },
      { code: 'CNY', name: 'Yuan cinese',         pct: 3.4  },
      { code: 'GBP', name: 'Sterlina',            pct: 3.4  },
      { code: 'CAD', name: 'Dollaro canadese',    pct: 2.9  },
      { code: 'INR', name: 'Rupia indiana',       pct: 2.2  },
      { code: 'CHF', name: 'Franco svizzero',     pct: 2.0  },
      { code: 'TWD', name: 'Dollaro taiwanese',   pct: 1.9  },
      { code: 'Altri', name: 'Altri',             pct: 6.2  },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 23.8 },
      { name: 'Finanza',                pct: 17.2 },
      { name: 'Sanità',                 pct: 10.8 },
      { name: 'Consumi discrezionali',  pct: 10.2 },
      { name: 'Industria',              pct: 10.1 },
      { name: 'Comunicazione',          pct: 8.2  },
      { name: 'Beni di consumo',        pct: 6.4  },
      { name: 'Energia',                pct: 5.1  },
      { name: 'Materiali',              pct: 4.2  },
      { name: 'Utility',                pct: 3.0  },
      { name: 'Immobiliare',            pct: 2.2  },
    ],
    topHoldings: [
      { name: 'Apple',                  pct: 3.9 },
      { name: 'NVIDIA',                 pct: 3.7 },
      { name: 'Microsoft',              pct: 3.6 },
      { name: 'Amazon',                 pct: 2.3 },
      { name: 'Meta Platforms',         pct: 1.8 },
      { name: 'Alphabet A',             pct: 1.5 },
      { name: 'Alphabet C',             pct: 1.4 },
      { name: 'Broadcom',               pct: 1.3 },
      { name: 'Tesla',                  pct: 1.0 },
      { name: 'JPMorgan Chase',         pct: 1.0 },
      { name: 'Eli Lilly',              pct: 0.7 },
      { name: 'Exxon Mobil',            pct: 0.6 },
      { name: 'Visa',                   pct: 0.6 },
      { name: 'TSMC',                   pct: 0.6 },
      { name: 'Samsung Electronics',    pct: 0.5 },
      { name: 'ASML Holding',           pct: 0.5 },
      { name: 'UnitedHealth Group',     pct: 0.5 },
      { name: 'Mastercard',             pct: 0.5 },
      { name: 'Novo Nordisk',           pct: 0.5 },
      { name: 'Costco',                 pct: 0.5 },
      { name: 'Home Depot',             pct: 0.4 },
      { name: 'Procter & Gamble',       pct: 0.4 },
      { name: 'Netflix',                pct: 0.4 },
      { name: 'Johnson & Johnson',      pct: 0.4 },
      { name: 'Oracle',                 pct: 0.4 },
      { name: 'Berkshire Hathaway B',   pct: 0.4 },
      { name: 'AbbVie',                 pct: 0.3 },
      { name: 'SAP',                    pct: 0.3 },
      { name: 'AMD',                    pct: 0.3 },
      { name: 'Salesforce',             pct: 0.3 },
      { name: 'Toyota Motor',           pct: 0.3 },
      { name: 'AstraZeneca',            pct: 0.3 },
      { name: 'Tencent',                pct: 0.3 },
      { name: 'Alibaba',                pct: 0.2 },
      { name: 'Reliance Industries',    pct: 0.2 },
      { name: 'LVMH',                   pct: 0.2 },
      { name: 'Nestlé',                 pct: 0.2 },
      { name: 'Accenture',              pct: 0.2 },
      { name: 'Goldman Sachs',          pct: 0.2 },
      { name: 'HSBC Holdings',          pct: 0.2 },
    ],
  },

  sp500: {
    assetType: 'equity',
    numHoldings: 500,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 100 },
    ],
    factors: { value: -0.3, growth: 0.5, momentum: 0.2, quality: 0.4, size: -0.5, lowVol: -0.2, yield: -0.3 },
    geography: [
      { country: "Stati Uniti", pct: 99.9 }
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA', pct: 100 },
    ],
    sectors: [
      { name: "Tecnologia", pct: 37.9 },
      { name: "Finanza", pct: 11.3 },
      { name: "Communication", pct: 10.6 },
      { name: "Consumi discrezionali", pct: 9.8 },
      { name: "Sanit\u00e0", pct: 8.4 },
      { name: "Industria", pct: 8.3 },
      { name: "Beni di consumo", pct: 4.7 },
      { name: "Energia", pct: 3.2 },
      { name: "Utility", pct: 2.1 },
      { name: "Materiali", pct: 1.9 },
      { name: "Immobiliare", pct: 1.8 }
    ],
    topHoldings: [
      { name: "NVIDIA CORP", pct: 8.02 },
      { name: "APPLE INC", pct: 7.06 },
      { name: "MICROSOFT CORP", pct: 4.88 },
      { name: "AMAZON.COM INC", pct: 4.12 },
      { name: "ALPHABET INC CLASS A", pct: 3.5 },
      { name: "BROADCOM INC", pct: 3.11 },
      { name: "ALPHABET INC CLASS C", pct: 2.78 },
      { name: "META PLATFORMS INC CLASS A", pct: 2.14 },
      { name: "TESLA INC", pct: 1.91 },
      { name: "MICRON TECHNOLOGY INC", pct: 1.6 }
    ],
  },

  nasdaq100: {
    assetType: 'equity',
    numHoldings: 100,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 96.8 },
      { name: 'Europa',       pct: 1.9  },
      { name: 'Altro',        pct: 1.3  },
    ],
    factors: { value: -0.8, growth: 1.5, momentum: 0.5, quality: 0.6, size: -0.6, lowVol: -0.4, yield: -0.7 },
    geography: [
      { country: "Stati Uniti", pct: 98.2 },
      { country: "Altro",       pct: 1.2  }
    ],
    currencies: [
      { code: 'USD',   name: 'Dollaro USA', pct: 96.8 },
      { code: 'EUR',   name: 'Euro',        pct: 1.8  },
      { code: 'GBP',   name: 'Sterlina',    pct: 0.9  },
      { code: 'Altri', name: 'Altri',       pct: 0.5  },
    ],
    sectors: [
      { name: "Tecnologia", pct: 58.0 },
      { name: "Communication", pct: 13.6 },
      { name: "Consumi discrezionali", pct: 11.5 },
      { name: "Beni di consumo", pct: 6.6 },
      { name: "Sanit\u00e0", pct: 3.7 },
      { name: "Industria", pct: 3.3 },
      { name: "Utility", pct: 1.2 },
      { name: "Materiali", pct: 1.0 },
      { name: "Energia", pct: 0.5 }
    ],
    topHoldings: [
      { name: "NVIDIA CORP", pct: 8.29 },
      { name: "APPLE INC", pct: 7.3 },
      { name: "MICROSOFT CORP", pct: 5.05 },
      { name: "AMAZON.COM INC", pct: 4.68 },
      { name: "MICRON TECHNOLOGY INC", pct: 4.57 },
      { name: "ADVANCED MICRO DEVICES INC", pct: 3.71 },
      { name: "ALPHABET INC CLASS A", pct: 3.61 },
      { name: "TESLA INC", pct: 3.51 },
      { name: "ALPHABET INC CLASS C", pct: 3.34 },
      { name: "BROADCOM INC", pct: 3.22 }
    ],
  },

  msci_em: {
    assetType: 'equity',
    numHoldings: 1350,
    marketType: [
      { type: 'Mercati emergenti', pct: 100 },
    ],
    area: [
      { name: 'Asia Emergente',   pct: 72.0 },
      { name: 'EMEA Emergente',   pct: 10.8 },
      { name: 'America Latina',   pct: 7.1  },
      { name: 'Altro',            pct: 10.1 },
    ],
    factors: { value: 0.3, growth: 0.0, momentum: -0.1, quality: -0.2, size: 0.2, lowVol: 0.0, yield: 0.3 },
    geography: [
      { country: 'Cina',           pct: 26.8 },
      { country: 'India',          pct: 18.5 },
      { country: 'Taiwan',         pct: 15.2 },
      { country: 'Corea del Sud',  pct: 11.5 },
      { country: 'Brasile',        pct: 5.2  },
      { country: 'Arabia Saudita', pct: 3.1  },
      { country: 'Sudafrica',      pct: 2.8  },
      { country: 'Messico',        pct: 1.9  },
      { country: 'Tailandia',      pct: 1.5  },
      { country: 'Indonesia',      pct: 1.4  },
      { country: 'Altri',          pct: 12.1 },
    ],
    currencies: [
      { code: 'CNY', name: 'Yuan cinese',       pct: 26.8 },
      { code: 'INR', name: 'Rupia indiana',     pct: 18.5 },
      { code: 'TWD', name: 'Dollaro taiwanese', pct: 15.2 },
      { code: 'KRW', name: 'Won sudcoreano',    pct: 11.5 },
      { code: 'BRL', name: 'Real brasiliano',   pct: 5.2  },
      { code: 'SAR', name: 'Riyal saudita',     pct: 3.1  },
      { code: 'ZAR', name: 'Rand sudafricano',  pct: 2.8  },
      { code: 'Altri', name: 'Altri',           pct: 16.9 },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 24.8 },
      { name: 'Finanza',                pct: 22.3 },
      { name: 'Consumi discrezionali',  pct: 13.5 },
      { name: 'Comunicazione',          pct: 10.2 },
      { name: 'Industria',              pct: 7.8  },
      { name: 'Beni di consumo',        pct: 6.5  },
      { name: 'Materiali',              pct: 5.9  },
      { name: 'Energia',                pct: 4.2  },
      { name: 'Sanità',                 pct: 3.5  },
      { name: 'Utility',                pct: 2.8  },
    ],
    topHoldings: [
      { name: 'TSMC',                    pct: 8.7  },
      { name: 'Tencent',                 pct: 4.5  },
      { name: 'Samsung Electronics',     pct: 3.2  },
      { name: 'Alibaba',                 pct: 2.9  },
      { name: 'Meituan',                 pct: 1.9  },
      { name: 'Reliance Industries',     pct: 1.6  },
      { name: 'Infosys',                 pct: 1.3  },
      { name: 'HDFC Bank',               pct: 1.2  },
      { name: 'Xiaomi',                  pct: 1.1  },
      { name: 'Vale',                    pct: 1.0  },
      { name: 'SK Hynix',               pct: 0.9  },
      { name: 'Tata Consultancy',        pct: 0.8  },
      { name: 'ICICI Bank',              pct: 0.8  },
      { name: 'JD.com',                  pct: 0.7  },
      { name: 'Baidu',                   pct: 0.6  },
      { name: 'Itau Unibanco',           pct: 0.6  },
      { name: 'MediaTek',                pct: 0.6  },
      { name: 'Saudi Aramco',            pct: 0.5  },
      { name: 'Petrobras',               pct: 0.5  },
      { name: 'Hyundai Motor',           pct: 0.5  },
      { name: 'BYD',                     pct: 0.5  },
      { name: 'NetEase',                 pct: 0.4  },
      { name: 'Bharti Airtel',           pct: 0.4  },
      { name: 'Axis Bank',               pct: 0.4  },
      { name: 'Larsen & Toubro',         pct: 0.4  },
      { name: 'KB Financial Group',      pct: 0.4  },
      { name: 'Al Rajhi Bank',           pct: 0.3  },
      { name: 'PTT',                     pct: 0.3  },
      { name: 'Mahindra & Mahindra',     pct: 0.3  },
      { name: 'ITC Limited',             pct: 0.3  },
    ],
  },

  msci_europe: {
    assetType: 'equity',
    numHoldings: 400,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    factors: { value: 0.3, growth: -0.1, momentum: -0.1, quality: 0.1, size: -0.2, lowVol: 0.1, yield: 0.4 },
    geography: [
      { country: 'Regno Unito', pct: 21.8 },
      { country: 'Francia',     pct: 18.1 },
      { country: 'Germania',    pct: 15.6 },
      { country: 'Svizzera',    pct: 14.8 },
      { country: 'Paesi Bassi', pct: 8.7  },
      { country: 'Svezia',      pct: 5.5  },
      { country: 'Danimarca',   pct: 5.3  },
      { country: 'Spagna',      pct: 3.8  },
      { country: 'Italia',      pct: 2.9  },
      { country: 'Finlandia',   pct: 1.5  },
      { country: 'Altri',       pct: 2.0  },
    ],
    currencies: [
      { code: 'GBP',   name: 'Sterlina',        pct: 21.8 },
      { code: 'EUR',   name: 'Euro',            pct: 60.8 },
      { code: 'CHF',   name: 'Franco svizzero', pct: 14.8 },
      { code: 'SEK',   name: 'Corona svedese',  pct: 5.5  },
      { code: 'DKK',   name: 'Corona danese',   pct: 5.3  },
      { code: 'Altri', name: 'Altri',           pct: 1.8  },
    ],
    sectors: [
      { name: 'Finanza',               pct: 19.2 },
      { name: 'Industria',             pct: 16.5 },
      { name: 'Sanità',                pct: 14.8 },
      { name: 'Beni di consumo',       pct: 12.3 },
      { name: 'Consumi discrezionali', pct: 9.6  },
      { name: 'Materiali',             pct: 7.8  },
      { name: 'Tecnologia',            pct: 7.1  },
      { name: 'Energia',               pct: 6.5  },
      { name: 'Comunicazione',         pct: 4.2  },
      { name: 'Utility',               pct: 3.8  },
    ],
    topHoldings: [
      { name: 'ASML Holding', pct: 4.5 },
      { name: 'Nestlé',       pct: 3.2 },
      { name: 'Novo Nordisk', pct: 3.1 },
      { name: 'LVMH',         pct: 2.8 },
      { name: 'SAP',          pct: 2.5 },
      { name: 'Roche',        pct: 2.3 },
      { name: 'Novartis',     pct: 2.1 },
      { name: 'Shell',        pct: 2.0 },
      { name: 'AstraZeneca',  pct: 1.9 },
      { name: 'HSBC',         pct: 1.8 },
    ],
  },

  euro_stoxx50: {
    assetType: 'equity',
    numHoldings: 50,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    factors: { value: 0.2, growth: 0.0, momentum: 0.0, quality: 0.2, size: -0.8, lowVol: 0.0, yield: 0.5 },
    geography: [
      { country: 'Francia',     pct: 36.5 },
      { country: 'Germania',    pct: 28.4 },
      { country: 'Paesi Bassi', pct: 12.8 },
      { country: 'Spagna',      pct: 9.2  },
      { country: 'Italia',      pct: 6.1  },
      { country: 'Finlandia',   pct: 3.5  },
      { country: 'Belgio',      pct: 2.0  },
      { country: 'Altri',       pct: 1.5  },
    ],
    currencies: [
      { code: 'EUR', name: 'Euro', pct: 100 },
    ],
    sectors: [
      { name: 'Industria',              pct: 20.1 },
      { name: 'Finanza',                pct: 17.8 },
      { name: 'Beni di consumo',        pct: 13.2 },
      { name: 'Tecnologia',             pct: 12.5 },
      { name: 'Sanità',                 pct: 11.4 },
      { name: 'Consumi discrezionali',  pct: 9.8  },
      { name: 'Energia',                pct: 8.1  },
      { name: 'Materiali',              pct: 4.2  },
      { name: 'Utility',                pct: 2.9  },
    ],
    topHoldings: [
      { name: 'ASML Holding',       pct: 8.9 },
      { name: 'LVMH',               pct: 5.2 },
      { name: 'SAP',                pct: 5.0 },
      { name: 'TotalEnergies',      pct: 4.5 },
      { name: 'Siemens',            pct: 4.2 },
      { name: 'Sanofi',             pct: 3.7 },
      { name: 'Schneider Electric', pct: 3.6 },
      { name: 'Airbus',             pct: 3.5 },
      { name: 'BNP Paribas',        pct: 3.2 },
      { name: 'Allianz',            pct: 3.0 },
    ],
  },

  msci_japan: {
    assetType: 'equity',
    numHoldings: 220,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Giappone', pct: 100 },
    ],
    factors: { value: 0.3, growth: -0.1, momentum: 0.0, quality: 0.0, size: -0.2, lowVol: 0.1, yield: 0.3 },
    geography: [{ country: 'Giappone', pct: 100 }],
    currencies: [{ code: 'JPY', name: 'Yen giapponese', pct: 100 }],
    sectors: [
      { name: 'Industria',              pct: 22.4 },
      { name: 'Consumi discrezionali',  pct: 19.6 },
      { name: 'Finanza',                pct: 15.8 },
      { name: 'Tecnologia',             pct: 12.3 },
      { name: 'Materiali',              pct: 8.5  },
      { name: 'Sanità',                 pct: 7.2  },
      { name: 'Comunicazione',          pct: 5.9  },
      { name: 'Beni di consumo',        pct: 5.1  },
      { name: 'Energia',                pct: 2.1  },
      { name: 'Utility',                pct: 1.1  },
    ],
    topHoldings: [
      { name: 'Toyota Motor',     pct: 4.1 },
      { name: 'Sony Group',       pct: 2.8 },
      { name: 'Mitsubishi UFJ',   pct: 2.3 },
      { name: 'Hitachi',          pct: 2.1 },
      { name: 'Keyence',          pct: 1.9 },
      { name: 'Sumitomo Mitsui',  pct: 1.7 },
      { name: 'Tokyo Electron',   pct: 1.6 },
      { name: 'Recruit Holdings', pct: 1.5 },
      { name: 'SoftBank Group',   pct: 1.4 },
      { name: 'Fast Retailing',   pct: 1.3 },
    ],
  },

  msci_world_sc: {
    assetType: 'equity',
    numHoldings: 3500,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 64.8 },
      { name: 'Europa',       pct: 17.6 },
      { name: 'Giappone',     pct: 8.1  },
      { name: 'Asia Pacifico',pct: 5.1  },
      { name: 'Altro',        pct: 4.4  },
    ],
    factors: { value: 0.2, growth: 0.0, momentum: 0.0, quality: -0.1, size: 1.5, lowVol: -0.1, yield: 0.1 },
    geography: [
      { country: 'Stati Uniti', pct: 59.8 },
      { country: 'Giappone',    pct: 8.1  },
      { country: 'Regno Unito', pct: 6.0  },
      { country: 'Canada',      pct: 5.0  },
      { country: 'Australia',   pct: 4.2  },
      { country: 'Germania',    pct: 3.1  },
      { country: 'Svezia',      pct: 2.9  },
      { country: 'Francia',     pct: 2.5  },
      { country: 'Svizzera',    pct: 2.1  },
      { country: 'Altri',       pct: 6.3  },
    ],
    currencies: [
      { code: 'USD',   name: 'Dollaro USA',         pct: 59.8 },
      { code: 'JPY',   name: 'Yen giapponese',      pct: 8.1  },
      { code: 'GBP',   name: 'Sterlina',            pct: 6.0  },
      { code: 'CAD',   name: 'Dollaro canadese',    pct: 5.0  },
      { code: 'EUR',   name: 'Euro',                pct: 10.4 },
      { code: 'AUD',   name: 'Dollaro australiano', pct: 4.2  },
      { code: 'Altri', name: 'Altri',               pct: 6.5  },
    ],
    sectors: [
      { name: 'Industria',              pct: 22.1 },
      { name: 'Finanza',                pct: 16.4 },
      { name: 'Tecnologia',             pct: 14.2 },
      { name: 'Consumi discrezionali',  pct: 11.8 },
      { name: 'Sanità',                 pct: 10.5 },
      { name: 'Materiali',              pct: 8.2  },
      { name: 'Beni di consumo',        pct: 6.1  },
      { name: 'Immobiliare',            pct: 4.8  },
      { name: 'Energia',                pct: 3.5  },
      { name: 'Utility',                pct: 2.4  },
    ],
  },

  global_agg_bond: {
    assetType: 'bond',
    bondInfo: { duration: 6.8, ytm: 3.4, creditRating: 'A', type: 'Governativo + Corporate globale' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 84.2 },
      { type: 'Mercati emergenti',  pct: 15.8 },
    ],
    area: [
      { name: 'Nord America', pct: 42.3 },
      { name: 'Europa',       pct: 31.2 },
      { name: 'Giappone',     pct: 15.1 },
      { name: 'Altro',        pct: 11.4 },
    ],
    geography: [
      { country: 'Stati Uniti', pct: 39.2 },
      { country: 'Giappone',    pct: 15.1 },
      { country: 'Francia',     pct: 7.3  },
      { country: 'Germania',    pct: 6.8  },
      { country: 'Regno Unito', pct: 5.9  },
      { country: 'Italia',      pct: 5.2  },
      { country: 'Cina',        pct: 4.8  },
      { country: 'Spagna',      pct: 3.9  },
      { country: 'Canada',      pct: 3.1  },
      { country: 'Altri',       pct: 8.7  },
    ],
    currencies: [
      { code: 'USD',   name: 'Dollaro USA',    pct: 39.2 },
      { code: 'EUR',   name: 'Euro',           pct: 26.4 },
      { code: 'JPY',   name: 'Yen giapponese', pct: 15.1 },
      { code: 'GBP',   name: 'Sterlina',       pct: 5.9  },
      { code: 'CNY',   name: 'Yuan cinese',    pct: 4.8  },
      { code: 'CAD',   name: 'Dollaro canadese', pct: 3.1 },
      { code: 'Altri', name: 'Altri',          pct: 5.5  },
    ],
    sectors: null, // bond ETF — no sector breakdown
  },

  euro_gov_bond: {
    assetType: 'bond',
    bondInfo: { duration: 7.2, ytm: 3.1, creditRating: 'AA-', type: 'Governativo EUR' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    geography: [
      { country: 'Italia',      pct: 25.1 },
      { country: 'Francia',     pct: 22.3 },
      { country: 'Germania',    pct: 20.1 },
      { country: 'Spagna',      pct: 16.4 },
      { country: 'Belgio',      pct: 5.8  },
      { country: 'Paesi Bassi', pct: 5.1  },
      { country: 'Austria',     pct: 2.8  },
      { country: 'Altri',       pct: 2.4  },
    ],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: null,
  },

  euro_corp_bond: {
    assetType: 'bond',
    bondInfo: { duration: 4.5, ytm: 3.8, creditRating: 'BBB+', type: 'Corporate EUR Investment Grade' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    geography: [
      { country: 'Francia',     pct: 18.2 },
      { country: 'Germania',    pct: 16.5 },
      { country: 'Regno Unito', pct: 13.1 },
      { country: 'Paesi Bassi', pct: 11.4 },
      { country: 'Italia',      pct: 9.3  },
      { country: 'Spagna',      pct: 7.8  },
      { country: 'Svezia',      pct: 4.2  },
      { country: 'Svizzera',    pct: 3.6  },
      { country: 'Lussemburgo', pct: 3.1  },
      { country: 'Altri',       pct: 12.8 },
    ],
    currencies: [
      { code: 'EUR',   name: 'Euro',           pct: 87.2 },
      { code: 'GBP',   name: 'Sterlina',       pct: 7.8  },
      { code: 'CHF',   name: 'Franco svizzero',pct: 3.6  },
      { code: 'Altri', name: 'Altri',          pct: 1.4  },
    ],
    sectors: null,
  },

  epra_nareit_dev: {
    assetType: 'real-estate',
    numHoldings: 340,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 65.4 },
      { name: 'Asia Pacifico',pct: 13.5 },
      { name: 'Giappone',     pct: 9.8  },
      { name: 'Europa',       pct: 7.2  },
      { name: 'Altro',        pct: 4.1  },
    ],
    factors: { value: 0.1, growth: -0.1, momentum: -0.1, quality: 0.0, size: -0.1, lowVol: 0.2, yield: 0.8 },
    geography: [
      { country: 'Stati Uniti', pct: 65.4 },
      { country: 'Giappone',    pct: 9.8  },
      { country: 'Australia',   pct: 5.6  },
      { country: 'Regno Unito', pct: 4.8  },
      { country: 'Singapore',   pct: 4.1  },
      { country: 'Francia',     pct: 3.2  },
      { country: 'Canada',      pct: 2.9  },
      { country: 'Altri',       pct: 4.2  },
    ],
    currencies: [
      { code: 'USD',   name: 'Dollaro USA',         pct: 65.4 },
      { code: 'JPY',   name: 'Yen giapponese',      pct: 9.8  },
      { code: 'AUD',   name: 'Dollaro australiano', pct: 5.6  },
      { code: 'GBP',   name: 'Sterlina',            pct: 4.8  },
      { code: 'SGD',   name: 'Dollaro singaporiano',pct: 4.1  },
      { code: 'EUR',   name: 'Euro',                pct: 6.1  },
      { code: 'CAD',   name: 'Dollaro canadese',    pct: 2.9  },
      { code: 'Altri', name: 'Altri',               pct: 1.3  },
    ],
    sectors: [
      { name: 'Immobiliare industriale',   pct: 28.4 },
      { name: 'Retail REIT',              pct: 18.2 },
      { name: 'Residenziale',             pct: 15.6 },
      { name: 'Uffici',                   pct: 12.3 },
      { name: 'Sanità REIT',              pct: 9.8  },
      { name: 'Infrastrutture',           pct: 8.5  },
      { name: 'Diversificato',            pct: 7.2  },
    ],
  },

  physical_gold: {
    assetType: 'commodity',
    _commodityType: 'precious_metal', // bassa/negativa correlazione con equity
    marketType: [],
    area: [],
    geography: [{ country: 'Globale (oro fisico)', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA (prezzo oro)', pct: 100 }],
    sectors: null,
    topHoldings: [{ name: 'Oro fisico (XAU)', pct: 100 }],
  },

  bloomberg_commodity: {
    assetType: 'commodity',
    _commodityType: 'broad', // correlazione moderata con equity (~0.18)
    marketType: [],
    area: [],
    geography: [{ country: 'Globale (basket materie prime)', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [
      { name: 'Energia',         pct: 30.5 },
      { name: 'Metalli preziosi',pct: 19.2 },
      { name: 'Agricoltura',     pct: 28.8 },
      { name: 'Metalli ind.',    pct: 14.7 },
      { name: 'Bestiame',        pct: 6.8  },
    ],
  },

  lifestrategy_20: {
    assetType: 'multi-asset',
    equityPct: 20,
    bondPct: 80,
    numHoldings: 10000,
    marketType: [
      { type: 'Mercati sviluppati', pct: 82.0 },
      { type: 'Mercati emergenti',  pct: 6.0  },
    ],
    area: [
      { name: 'Europa',       pct: 45.2 },
      { name: 'Nord America', pct: 20.5 },
      { name: 'Giappone',     pct: 10.8 },
      { name: 'Altro',        pct: 23.5 },
    ],
    geography: [
      { country: 'Stati Uniti', pct: 14.2 },
      { country: 'Giappone',    pct: 10.8 },
      { country: 'Francia',     pct: 9.1  },
      { country: 'Germania',    pct: 8.3  },
      { country: 'Italia',      pct: 7.2  },
      { country: 'Regno Unito', pct: 6.8  },
      { country: 'Spagna',      pct: 5.9  },
      { country: 'Canada',      pct: 1.4  },
      { country: 'Altri',       pct: 36.3 },
    ],
    currencies: [
      { code: 'EUR',   name: 'Euro',           pct: 48.2 },
      { code: 'USD',   name: 'Dollaro USA',    pct: 21.3 },
      { code: 'JPY',   name: 'Yen giapponese', pct: 10.8 },
      { code: 'GBP',   name: 'Sterlina',       pct: 6.8  },
      { code: 'Altri', name: 'Altri',          pct: 12.9 },
    ],
    sectors: null, // multi-asset
  },

  lifestrategy_80: {
    assetType: 'multi-asset',
    equityPct: 80,
    bondPct: 20,
    numHoldings: 10000,
    marketType: [
      { type: 'Mercati sviluppati', pct: 88.0 },
      { type: 'Mercati emergenti',  pct: 7.0  },
    ],
    area: [
      { name: 'Nord America', pct: 57.2 },
      { name: 'Europa',       pct: 18.4 },
      { name: 'Giappone',     pct: 4.5  },
      { name: 'Altro',        pct: 19.9 },
    ],
    geography: [
      { country: 'Stati Uniti', pct: 57.2 },
      { country: 'Giappone',    pct: 4.5  },
      { country: 'Francia',     pct: 4.1  },
      { country: 'Germania',    pct: 3.8  },
      { country: 'Regno Unito', pct: 3.5  },
      { country: 'Canada',      pct: 2.8  },
      { country: 'Svizzera',    pct: 1.9  },
      { country: 'Australia',   pct: 1.4  },
      { country: 'Italia',      pct: 2.8  },
      { country: 'Altri',       pct: 18.0 },
    ],
    currencies: [
      { code: 'USD',   name: 'Dollaro USA',    pct: 57.2 },
      { code: 'EUR',   name: 'Euro',           pct: 18.5 },
      { code: 'JPY',   name: 'Yen giapponese', pct: 4.5  },
      { code: 'GBP',   name: 'Sterlina',       pct: 3.5  },
      { code: 'CAD',   name: 'Dollaro canadese', pct: 2.8 },
      { code: 'Altri', name: 'Altri',          pct: 13.5 },
    ],
    sectors: null, // multi-asset
  },

  dividend_global: {
    assetType: 'equity',
    numHoldings: 1800,
    marketType: [
      { type: 'Mercati sviluppati', pct: 96.0 },
      { type: 'Mercati emergenti',  pct: 4.0  },
    ],
    area: [
      { name: 'Nord America', pct: 45.9 },
      { name: 'Europa',       pct: 31.2 },
      { name: 'Giappone',     pct: 9.4  },
      { name: 'Asia Pacifico',pct: 7.5  },
      { name: 'Altro',        pct: 6.0  },
    ],
    factors: { value: 0.5, growth: -0.4, momentum: -0.1, quality: 0.2, size: -0.2, lowVol: 0.3, yield: 1.0 },
    geography: [
      { country: 'Stati Uniti', pct: 38.1 },
      { country: 'Regno Unito', pct: 11.2 },
      { country: 'Giappone',    pct: 9.4  },
      { country: 'Canada',      pct: 7.8  },
      { country: 'Australia',   pct: 6.9  },
      { country: 'Francia',     pct: 5.2  },
      { country: 'Germania',    pct: 4.1  },
      { country: 'Svizzera',    pct: 3.8  },
      { country: 'Altri',       pct: 13.5 },
    ],
    currencies: [
      { code: 'USD',   name: 'Dollaro USA',         pct: 38.1 },
      { code: 'GBP',   name: 'Sterlina',            pct: 11.2 },
      { code: 'JPY',   name: 'Yen giapponese',      pct: 9.4  },
      { code: 'CAD',   name: 'Dollaro canadese',    pct: 7.8  },
      { code: 'AUD',   name: 'Dollaro australiano', pct: 6.9  },
      { code: 'EUR',   name: 'Euro',                pct: 16.1 },
      { code: 'CHF',   name: 'Franco svizzero',     pct: 3.8  },
      { code: 'Altri', name: 'Altri',               pct: 6.7  },
    ],
    sectors: [
      { name: 'Finanza',               pct: 21.4 },
      { name: 'Sanità',                pct: 14.2 },
      { name: 'Beni di consumo',       pct: 12.8 },
      { name: 'Energia',               pct: 11.5 },
      { name: 'Industria',             pct: 10.8 },
      { name: 'Utility',               pct: 9.2  },
      { name: 'Tecnologia',            pct: 7.4  },
      { name: 'Consumi discrezionali', pct: 6.3  },
      { name: 'Materiali',             pct: 4.2  },
      { name: 'Comunicazione',         pct: 2.2  },
    ],
    topHoldings: [
      { name: 'Exxon Mobil',         pct: 2.8 },
      { name: 'Johnson & Johnson',   pct: 2.2 },
      { name: 'JPMorgan Chase',      pct: 2.0 },
      { name: 'HSBC',                pct: 1.9 },
      { name: 'Samsung Electronics', pct: 1.8 },
      { name: 'Shell',               pct: 1.7 },
      { name: 'Chevron',             pct: 1.6 },
      { name: 'Nestlé',              pct: 1.5 },
      { name: 'AstraZeneca',         pct: 1.5 },
      { name: 'Taiwan Semiconductor',pct: 1.4 },
    ],
  },

  dividend_europe: {
    assetType: 'equity',
    numHoldings: 100,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    factors: { value: 0.6, growth: -0.4, momentum: -0.1, quality: 0.1, size: -0.3, lowVol: 0.3, yield: 1.2 },
    geography: [
      { country: 'Francia',     pct: 22.1 },
      { country: 'Germania',    pct: 19.3 },
      { country: 'Svezia',      pct: 14.8 },
      { country: 'Paesi Bassi', pct: 12.6 },
      { country: 'Svizzera',    pct: 10.2 },
      { country: 'Spagna',      pct: 8.4  },
      { country: 'Belgio',      pct: 5.9  },
      { country: 'Altri',       pct: 6.7  },
    ],
    currencies: [
      { code: 'EUR', name: 'Euro',           pct: 75.1 },
      { code: 'SEK', name: 'Corona svedese', pct: 14.8 },
      { code: 'CHF', name: 'Franco svizzero',pct: 10.2 },
    ],
    sectors: [
      { name: 'Finanza',               pct: 23.5 },
      { name: 'Beni di consumo',       pct: 16.2 },
      { name: 'Industria',             pct: 14.8 },
      { name: 'Utility',               pct: 12.4 },
      { name: 'Sanità',                pct: 11.6 },
      { name: 'Energia',               pct: 9.8  },
      { name: 'Materiali',             pct: 5.8  },
      { name: 'Tecnologia',            pct: 4.2  },
      { name: 'Comunicazione',         pct: 1.7  },
    ],
  },

  usd_treasury: {
    assetType: 'bond',
    bondInfo: { duration: 6.1, ytm: 4.3, creditRating: 'AAA', type: 'Governativo USD' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 100 },
    ],
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: null,
  },

  usd_treasury_long: {
    assetType: 'bond',
    bondInfo: { duration: 18.5, ytm: 4.7, creditRating: 'AAA', type: 'Governativo USD Lungo Termine' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 100 },
    ],
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: null,
  },

  usd_corp_bond: {
    assetType: 'bond',
    bondInfo: { duration: 7.4, ytm: 5.2, creditRating: 'BBB+', type: 'Corporate USD Investment Grade' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 84.3 },
      { name: 'Europa',       pct: 9.4  },
      { name: 'Altro',        pct: 6.3  },
    ],
    geography: [
      { country: 'Stati Uniti', pct: 84.3 },
      { country: 'Regno Unito', pct: 4.8  },
      { country: 'Canada',      pct: 3.1  },
      { country: 'Paesi Bassi', pct: 2.4  },
      { country: 'Francia',     pct: 2.2  },
      { country: 'Giappone',    pct: 1.2  },
      { country: 'Altri',       pct: 2.0  },
    ],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: null,
  },

  em_bond_hard: {
    assetType: 'bond',
    bondInfo: { duration: 8.2, ytm: 6.8, creditRating: 'BB+', type: 'EM Governativo/Corporate USD' },
    marketType: [
      { type: 'Mercati emergenti', pct: 100 },
    ],
    area: [
      { name: 'America Latina', pct: 22.5 },
      { name: 'EMEA Emergente', pct: 20.5 },
      { name: 'Asia Emergente', pct: 18.5 },
      { name: 'Altro',          pct: 38.5 },
    ],
    geography: [
      { country: 'Messico',        pct: 7.8  },
      { country: 'Indonesia',      pct: 7.2  },
      { country: 'Arabia Saudita', pct: 6.4  },
      { country: 'Turchia',        pct: 5.9  },
      { country: 'Brasile',        pct: 5.6  },
      { country: 'Cina',           pct: 5.1  },
      { country: 'Colombia',       pct: 3.8  },
      { country: 'Filippine',      pct: 3.5  },
      { country: 'Sudafrica',      pct: 3.2  },
      { country: 'Altri',          pct: 51.5 },
    ],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: null,
  },

  overnight_eur: {
    assetType: 'money-market',
    bondInfo: { duration: 0.003, ytm: 2.5, creditRating: 'AAA', type: 'Monetario overnight EUR (€STR)' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    geography: [{ country: 'Eurozona', pct: 100 }],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: null,
    topHoldings: [{ name: 'Depositi overnight BCE (€STR)', pct: 100 }],
  },

  ultra_short_eur: {
    assetType: 'bond',
    bondInfo: { duration: 0.25, ytm: 2.8, creditRating: 'AA', type: 'Ultra-short EUR' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    geography: [
      { country: 'Germania',    pct: 28.4 },
      { country: 'Francia',     pct: 22.1 },
      { country: 'Italia',      pct: 17.6 },
      { country: 'Spagna',      pct: 12.3 },
      { country: 'Paesi Bassi', pct: 8.2  },
      { country: 'Belgio',      pct: 5.6  },
      { country: 'Austria',     pct: 3.2  },
      { country: 'Altri',       pct: 2.6  },
    ],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: null,
  },

  bitcoin_spot: {
    assetType: 'crypto',
    marketType: [],
    area: [],
    geography: [],
    currencies: [{ code: 'USD', name: 'Dollaro USA (quotazione)', pct: 100 }],
    sectors: [{ name: 'Crypto / Digital Assets', pct: 100 }],
    topHoldings: [{ name: 'Bitcoin (BTC)', pct: 100 }],
  },

  ethereum_spot: {
    assetType: 'crypto',
    marketType: [],
    area: [],
    geography: [],
    currencies: [{ code: 'USD', name: 'Dollaro USA (quotazione)', pct: 100 }],
    sectors: [{ name: 'Crypto / Digital Assets', pct: 100 }],
    topHoldings: [{ name: 'Ethereum (ETH)', pct: 100 }],
  },

  msci_pacific_exjp: {
    assetType: 'equity',
    numHoldings: 200,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Asia Pacifico', pct: 100 },
    ],
    factors: { value: 0.4, growth: -0.2, momentum: -0.1, quality: 0.0, size: -0.1, lowVol: 0.1, yield: 0.5 },
    geography: [
      { country: 'Australia',     pct: 60.2 },
      { country: 'Corea del Sud', pct: 16.1 },
      { country: 'Hong Kong',     pct: 13.8 },
      { country: 'Nuova Zelanda', pct: 5.7  },
      { country: 'Singapore',     pct: 4.2  },
    ],
    currencies: [
      { code: 'AUD', name: 'Dollaro australiano',  pct: 60.2 },
      { code: 'KRW', name: 'Won sudcoreano',        pct: 16.1 },
      { code: 'HKD', name: 'Dollaro hongkonghese',  pct: 13.8 },
      { code: 'NZD', name: 'Dollaro neozelandese',  pct: 5.7  },
      { code: 'SGD', name: 'Dollaro singaporiano',  pct: 4.2  },
    ],
    sectors: [
      { name: 'Finanza',               pct: 28.4 },
      { name: 'Materiali',             pct: 16.2 },
      { name: 'Industria',             pct: 12.8 },
      { name: 'Beni di consumo',       pct: 10.5 },
      { name: 'Tecnologia',            pct: 9.8  },
      { name: 'Sanità',                pct: 8.4  },
      { name: 'Energia',               pct: 5.6  },
      { name: 'Consumi discrezionali', pct: 4.8  },
      { name: 'Utility',               pct: 3.5  },
    ],
  },

  // ── Factor ETFs ─────────────────────────────────────────────────────────────

  msci_world_momentum: {
    // Xtrackers / iShares MSCI World Momentum — forte tilt USA/tech, dati 2025
    assetType: 'equity',
    numHoldings: 350,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 80.4 },
      { name: 'Europa',       pct: 10.3 },
      { name: 'Giappone',     pct: 4.8  },
      { name: 'Altro',        pct: 4.5  },
    ],
    factors: { value: -0.5, growth: 0.6, momentum: 1.8, quality: 0.4, size: -0.3, lowVol: -0.2, yield: -0.4 },
    geography: [
      { country: 'Stati Uniti',    pct: 78.2 },
      { country: 'Giappone',       pct: 4.8  },
      { country: 'Francia',        pct: 3.1  },
      { country: 'Regno Unito',    pct: 2.5  },
      { country: 'Canada',         pct: 2.2  },
      { country: 'Svezia',         pct: 2.0  },
      { country: 'Germania',       pct: 1.8  },
      { country: 'Svizzera',       pct: 1.4  },
      { country: 'Danimarca',      pct: 1.2  },
      { country: 'Altri',          pct: 2.8  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',         pct: 78.2 },
      { code: 'EUR', name: 'Euro',                pct: 8.9  },
      { code: 'JPY', name: 'Yen giapponese',      pct: 4.8  },
      { code: 'GBP', name: 'Sterlina',            pct: 2.5  },
      { code: 'CAD', name: 'Dollaro canadese',    pct: 2.2  },
      { code: 'SEK', name: 'Corona svedese',      pct: 2.0  },
      { code: 'CHF', name: 'Franco svizzero',     pct: 1.4  },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 38.4 },
      { name: 'Finanza',                pct: 14.2 },
      { name: 'Comunicazione',          pct: 10.1 },
      { name: 'Sanità',                 pct: 9.0  },
      { name: 'Consumi discrezionali',  pct: 8.2  },
      { name: 'Industria',              pct: 7.4  },
      { name: 'Beni di consumo',        pct: 4.1  },
      { name: 'Energia',                pct: 3.8  },
      { name: 'Materiali',              pct: 2.6  },
      { name: 'Utility',                pct: 2.2  },
    ],
    topHoldings: [
      { name: 'NVIDIA',           pct: 7.2 },
      { name: 'Apple',            pct: 6.5 },
      { name: 'Microsoft',        pct: 5.8 },
      { name: 'Meta Platforms',   pct: 4.9 },
      { name: 'Amazon',           pct: 3.8 },
      { name: 'Alphabet A',       pct: 2.8 },
      { name: 'Broadcom',         pct: 2.5 },
      { name: 'Tesla',            pct: 2.1 },
      { name: 'JPMorgan Chase',   pct: 1.9 },
      { name: 'Eli Lilly',        pct: 1.8 },
    ],
  },

  msci_world_quality: {
    // Xtrackers / iShares MSCI World Quality — tilt verso titoli ad alta qualità, dati 2025
    assetType: 'equity',
    numHoldings: 300,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 76.0 },
      { name: 'Europa',       pct: 13.5 },
      { name: 'Giappone',     pct: 5.1  },
      { name: 'Asia Pacifico',pct: 2.0  },
      { name: 'Altro',        pct: 3.4  },
    ],
    factors: { value: -0.3, growth: 0.5, momentum: 0.2, quality: 1.6, size: -0.2, lowVol: 0.2, yield: -0.1 },
    geography: [
      { country: 'Stati Uniti',    pct: 73.1 },
      { country: 'Giappone',       pct: 5.1  },
      { country: 'Regno Unito',    pct: 3.8  },
      { country: 'Francia',        pct: 3.2  },
      { country: 'Canada',         pct: 2.9  },
      { country: 'Danimarca',      pct: 2.1  },
      { country: 'Svizzera',       pct: 2.0  },
      { country: 'Germania',       pct: 1.9  },
      { country: 'Australia',      pct: 1.5  },
      { country: 'Altri',          pct: 4.4  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',         pct: 73.1 },
      { code: 'EUR', name: 'Euro',                pct: 10.6 },
      { code: 'JPY', name: 'Yen giapponese',      pct: 5.1  },
      { code: 'GBP', name: 'Sterlina',            pct: 3.8  },
      { code: 'CAD', name: 'Dollaro canadese',    pct: 2.9  },
      { code: 'CHF', name: 'Franco svizzero',     pct: 2.0  },
      { code: 'DKK', name: 'Corona danese',       pct: 2.1  },
      { code: 'Altri', name: 'Altri',             pct: 0.4  },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 29.3 },
      { name: 'Sanità',                 pct: 16.1 },
      { name: 'Finanza',                pct: 13.8 },
      { name: 'Consumi discrezionali',  pct: 11.2 },
      { name: 'Industria',              pct: 10.4 },
      { name: 'Comunicazione',          pct: 7.1  },
      { name: 'Beni di consumo',        pct: 5.2  },
      { name: 'Materiali',              pct: 4.1  },
      { name: 'Utility',                pct: 1.9  },
      { name: 'Energia',                pct: 0.9  },
    ],
    topHoldings: [
      { name: 'Microsoft',        pct: 6.5 },
      { name: 'Apple',            pct: 5.9 },
      { name: 'NVIDIA',           pct: 4.8 },
      { name: 'Meta Platforms',   pct: 3.9 },
      { name: 'Alphabet A',       pct: 3.2 },
      { name: 'Amazon',           pct: 3.0 },
      { name: 'Visa',             pct: 2.1 },
      { name: 'Novo Nordisk',     pct: 2.0 },
      { name: 'ASML',             pct: 1.9 },
      { name: 'Mastercard',       pct: 1.8 },
    ],
  },

  // ── Small Cap Value ──────────────────────────────────────────────────────────

  msci_usa_sc_value: {
    // SPDR MSCI USA Small Cap Value Weighted — 100% USA, dati 2025
    assetType: 'equity',
    numHoldings: 600,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 100 },
    ],
    factors: { value: 1.4, growth: -0.8, momentum: -0.2, quality: -0.3, size: 1.6, lowVol: 0.1, yield: 0.5 },
    geography: [
      { country: 'Stati Uniti', pct: 100 },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA', pct: 100 },
    ],
    sectors: [
      { name: 'Finanza',                pct: 22.1 },
      { name: 'Industria',              pct: 17.8 },
      { name: 'Immobiliare',            pct: 12.4 },
      { name: 'Consumi discrezionali',  pct: 11.3 },
      { name: 'Sanità',                 pct: 8.2  },
      { name: 'Energia',                pct: 7.1  },
      { name: 'Materiali',              pct: 6.9  },
      { name: 'Tecnologia',             pct: 6.8  },
      { name: 'Utility',                pct: 4.7  },
      { name: 'Comunicazione',          pct: 2.7  },
    ],
    topHoldings: [
      { name: 'Glacier Bancorp',         pct: 0.52 },
      { name: 'Kite Realty Group',       pct: 0.49 },
      { name: 'Retail Opportunity Inv.', pct: 0.47 },
      { name: 'National Retail Props',   pct: 0.46 },
      { name: 'Hawthorn Bankshares',     pct: 0.45 },
      { name: 'Columbia Banking System', pct: 0.44 },
      { name: 'Heartland Financial',     pct: 0.43 },
      { name: 'Moog',                    pct: 0.42 },
      { name: 'Wintrust Financial',      pct: 0.41 },
      { name: 'Ameris Bancorp',          pct: 0.40 },
    ],
  },

  msci_europe_sc_value: {
    // SPDR MSCI Europe Small Cap Value Weighted — dati 2025
    assetType: 'equity',
    numHoldings: 450,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    factors: { value: 1.3, growth: -0.6, momentum: -0.1, quality: -0.2, size: 1.5, lowVol: 0.1, yield: 0.6 },
    geography: [
      { country: 'Regno Unito',    pct: 24.8 },
      { country: 'Svezia',         pct: 12.1 },
      { country: 'Germania',       pct: 10.9 },
      { country: 'Svizzera',       pct: 8.4  },
      { country: 'Francia',        pct: 8.1  },
      { country: 'Italia',         pct: 7.2  },
      { country: 'Paesi Bassi',    pct: 5.1  },
      { country: 'Norvegia',       pct: 4.8  },
      { country: 'Danimarca',      pct: 4.2  },
      { country: 'Finlandia',      pct: 3.1  },
      { country: 'Altri',          pct: 11.3 },
    ],
    currencies: [
      { code: 'GBP', name: 'Sterlina',            pct: 24.8 },
      { code: 'EUR', name: 'Euro',                pct: 52.1 },
      { code: 'SEK', name: 'Corona svedese',      pct: 12.1 },
      { code: 'CHF', name: 'Franco svizzero',     pct: 8.4  },
      { code: 'NOK', name: 'Corona norvegese',    pct: 2.6  },
    ],
    sectors: [
      { name: 'Industria',              pct: 22.4 },
      { name: 'Finanza',                pct: 18.7 },
      { name: 'Consumi discrezionali',  pct: 11.2 },
      { name: 'Materiali',              pct: 9.4  },
      { name: 'Immobiliare',            pct: 8.1  },
      { name: 'Sanità',                 pct: 7.2  },
      { name: 'Energia',                pct: 6.1  },
      { name: 'Utility',                pct: 6.0  },
      { name: 'Beni di consumo',        pct: 5.8  },
      { name: 'Tecnologia',             pct: 5.1  },
    ],
    topHoldings: [
      { name: 'Britvic',                   pct: 0.68 },
      { name: 'Diploma',                   pct: 0.65 },
      { name: 'Volution Group',            pct: 0.63 },
      { name: 'Breedon Group',             pct: 0.61 },
      { name: 'Grafton Group',             pct: 0.59 },
      { name: 'Instalco',                  pct: 0.57 },
      { name: 'Sdiptech',                  pct: 0.55 },
      { name: 'Fenix Outdoor',             pct: 0.53 },
      { name: 'Cembra Money Bank',         pct: 0.52 },
      { name: 'Howden Joinery',            pct: 0.50 },
    ],
  },

  // ── S&P 500 High Dividend ────────────────────────────────────────────────────

  sp500_high_div: {
    // SPDR S&P 500 High Dividend UCITS ETF — 100% USA, alto dividendo, dati 2025
    assetType: 'equity',
    numHoldings: 80,
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Nord America', pct: 100 },
    ],
    factors: { value: 0.7, growth: -0.6, momentum: -0.3, quality: 0.0, size: -0.4, lowVol: 0.4, yield: 1.4 },
    geography: [
      { country: 'Stati Uniti', pct: 100 },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA', pct: 100 },
    ],
    sectors: [
      { name: 'Utility',                pct: 18.2 },
      { name: 'Finanza',                pct: 15.8 },
      { name: 'Energia',                pct: 13.9 },
      { name: 'Immobiliare',            pct: 12.1 },
      { name: 'Sanità',                 pct: 10.4 },
      { name: 'Industria',              pct: 8.3  },
      { name: 'Beni di consumo',        pct: 7.2  },
      { name: 'Consumi discrezionali',  pct: 6.1  },
      { name: 'Materiali',              pct: 4.8  },
      { name: 'Comunicazione',          pct: 3.2  },
    ],
    topHoldings: [
      { name: 'Altria Group',          pct: 1.38 },
      { name: 'Verizon',               pct: 1.35 },
      { name: 'AT&T',                  pct: 1.33 },
      { name: 'IBM',                   pct: 1.31 },
      { name: 'Realty Income',         pct: 1.29 },
      { name: 'Pfizer',                pct: 1.27 },
      { name: 'ConocoPhillips',        pct: 1.25 },
      { name: 'Exxon Mobil',           pct: 1.24 },
      { name: 'Chevron',               pct: 1.22 },
      { name: 'Simon Property Group',  pct: 1.20 },
    ],
  },

  // ── Singole azioni USA ───────────────────────────────────────────────────────
  // Per i titoli singoli la composizione geografica/valutaria è al 100%
  // nel paese/valuta della borsa di quotazione primaria.

  us_stock_tech: {
    // Titoli tech USA: MSFT, AAPL, NVDA, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: -0.5, growth: 0.8, momentum: 0.2, quality: 0.4, size: -0.8, lowVol: -0.3, yield: -0.6 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Tecnologia', pct: 100 }],
  },

  us_stock_finance: {
    // Titoli finanziari USA: AXP, V, JPM, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.2, growth: 0.0, momentum: 0.0, quality: 0.2, size: -0.5, lowVol: -0.1, yield: 0.3 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Finanza', pct: 100 }],
  },

  us_stock_health: {
    // Titoli healthcare USA: ABBV, JNJ, PFE, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.0, growth: 0.3, momentum: 0.0, quality: 0.5, size: -0.3, lowVol: 0.1, yield: 0.1 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Sanità', pct: 100 }],
  },

  us_stock_consumer_disc: {
    // Titoli consumer discretionary USA: NKE, AMZN, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: -0.3, growth: 0.4, momentum: 0.1, quality: 0.2, size: -0.5, lowVol: -0.2, yield: -0.3 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Consumi discrezionali', pct: 100 }],
  },

  us_stock_reit: {
    // REIT USA: O (Realty Income), AMT, etc.
    _isDirectStock: true,
    assetType: 'real-estate',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.1, growth: -0.1, momentum: -0.1, quality: 0.1, size: -0.2, lowVol: 0.2, yield: 0.9 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Immobiliare', pct: 100 }],
  },

  us_stock_comm: {
    // Titoli comunicazione USA: GOOGL, META, DIS, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: -0.3, growth: 0.4, momentum: 0.1, quality: 0.3, size: -0.6, lowVol: -0.2, yield: -0.2 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Comunicazione', pct: 100 }],
  },

  us_stock_energy: {
    // Titoli energia USA: XOM, CVX, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.4, growth: -0.2, momentum: 0.1, quality: 0.1, size: -0.3, lowVol: -0.1, yield: 0.5 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Energia', pct: 100 }],
  },

  us_stock_consumer_staples: {
    // Titoli beni di consumo USA: PG, KO, PEP, WMT, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.2, growth: -0.1, momentum: -0.1, quality: 0.4, size: -0.4, lowVol: 0.4, yield: 0.5 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Beni di consumo', pct: 100 }],
  },

  us_stock_utility: {
    // Titoli utility USA
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.2, growth: -0.3, momentum: -0.1, quality: 0.1, size: -0.4, lowVol: 0.6, yield: 0.7 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Utility', pct: 100 }],
  },

  // ── Profili generici di fallback per azioni non mappate ─────────────────────
  _fallback_us: {
    _isDirectStock: true, _isFallback: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.0, growth: 0.0, momentum: 0.0, quality: 0.0, size: 0.0, lowVol: 0.0, yield: 0.0 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Azionario USA', pct: 100 }],
  },
  _fallback_uk: {
    _isDirectStock: true, _isFallback: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 0.0, growth: 0.0, momentum: 0.0, quality: 0.0, size: 0.0, lowVol: 0.0, yield: 0.0 },
    geography: [{ country: 'Regno Unito', pct: 100 }],
    currencies: [{ code: 'GBP', name: 'Sterlina', pct: 100 }],
    sectors: [{ name: 'Azionario UK', pct: 100 }],
  },
  _fallback_eu_eur: {
    _isDirectStock: true, _isFallback: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 0.0, growth: 0.0, momentum: 0.0, quality: 0.0, size: 0.0, lowVol: 0.0, yield: 0.0 },
    geography: [{ country: 'Europa', pct: 100 }],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: [{ name: 'Azionario Europa', pct: 100 }],
  },
  _fallback_jp: {
    _isDirectStock: true, _isFallback: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Asia', pct: 100 }],
    factors: { value: 0.0, growth: 0.0, momentum: 0.0, quality: 0.0, size: 0.0, lowVol: 0.0, yield: 0.0 },
    geography: [{ country: 'Giappone', pct: 100 }],
    currencies: [{ code: 'JPY', name: 'Yen giapponese', pct: 100 }],
    sectors: [{ name: 'Azionario Giappone', pct: 100 }],
  },
  _fallback_other: {
    _isDirectStock: true, _isFallback: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Globale', pct: 100 }],
    factors: { value: 0.0, growth: 0.0, momentum: 0.0, quality: 0.0, size: 0.0, lowVol: 0.0, yield: 0.0 },
    geography: [{ country: 'Globale', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Azionario', pct: 100 }],
  },

  us_stock_bdc: {
    // BDC — Business Development Companies: ARCC, MAIN, BXSL, FSK, etc.
    // Prestano capitale a società private mid-market; alto dividendo, settore finanziario alternativo
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.5, growth: -0.2, momentum: 0.0, quality: 0.1, size: -0.3, lowVol: 0.1, yield: 1.0 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Finanza', pct: 80 }, { name: 'Immobiliare', pct: 20 }],
  },

  us_stock_materials: {
    // Titoli materiali USA
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.3, growth: -0.1, momentum: 0.0, quality: 0.1, size: -0.3, lowVol: -0.1, yield: 0.2 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Materiali', pct: 100 }],
  },

  us_stock_industrial: {
    // Titoli industriali USA: CAT, GE, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    factors: { value: 0.1, growth: 0.1, momentum: 0.1, quality: 0.3, size: -0.4, lowVol: 0.0, yield: 0.2 },
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: [{ name: 'Industria', pct: 100 }],
  },

  uk_stock_consumer_disc: {
    // Titoli consumer disc quotati a Londra in GBP: CCL.L, etc.
    _isDirectStock: true,
    assetType: 'equity',
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 0.2, growth: -0.1, momentum: 0.0, quality: 0.0, size: -0.3, lowVol: 0.1, yield: 0.3 },
    geography: [{ country: 'Regno Unito', pct: 100 }],
    currencies: [{ code: 'GBP', name: 'Sterlina', pct: 100 }],
    sectors: [{ name: 'Consumi discrezionali', pct: 100 }],
  },

  // ── Nuovi profili aggiunti ─────────────────────────────────────────────────

  msci_acwi: {
    assetType: 'equity',
    numHoldings: 2900,
    marketType: [
      { type: 'Mercati sviluppati', pct: 88.2 },
      { type: 'Mercati emergenti',  pct: 11.8 },
    ],
    area: [
      { name: 'Nord America',      pct: 65.8 },
      { name: 'Europa',            pct: 14.0 },
      { name: 'Asia Emergente',    pct: 9.8  },
      { name: 'Giappone',          pct: 4.9  },
      { name: 'Asia Pacifico',     pct: 2.6  },
      { name: 'Altro',             pct: 2.9  },
    ],
    factors: { value: -0.1, growth: 0.3, momentum: 0.1, quality: 0.2, size: -0.2, lowVol: -0.1, yield: -0.1 },
    geography: [
      { country: 'Stati Uniti',    pct: 63.9 },
      { country: 'Giappone',       pct: 4.9  },
      { country: 'Regno Unito',    pct: 3.4  },
      { country: 'Canada',         pct: 3.1  },
      { country: 'Cina',           pct: 2.9  },
      { country: 'Francia',        pct: 2.2  },
      { country: 'India',          pct: 2.2  },
      { country: 'Svizzera',       pct: 2.0  },
      { country: 'Germania',       pct: 1.9  },
      { country: 'Taiwan',         pct: 1.8  },
      { country: 'Altri',          pct: 11.7 },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',         pct: 63.9 },
      { code: 'EUR', name: 'Euro',                pct: 9.7  },
      { code: 'JPY', name: 'Yen giapponese',      pct: 4.9  },
      { code: 'GBP', name: 'Sterlina',            pct: 3.4  },
      { code: 'CAD', name: 'Dollaro canadese',    pct: 3.1  },
      { code: 'CNY', name: 'Yuan cinese',         pct: 2.9  },
      { code: 'Altri', name: 'Altri',             pct: 12.1 },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 23.8 },
      { name: 'Finanza',                pct: 16.4 },
      { name: 'Sanità',                 pct: 11.2 },
      { name: 'Consumi discrezionali',  pct: 10.8 },
      { name: 'Industria',              pct: 10.3 },
      { name: 'Comunicazione',          pct: 7.6  },
      { name: 'Beni di consumo',        pct: 6.9  },
      { name: 'Energia',                pct: 4.2  },
      { name: 'Materiali',              pct: 3.8  },
      { name: 'Utility',                pct: 2.7  },
      { name: 'Immobiliare',            pct: 2.3  },
    ],
    topHoldings: [
      { name: 'Apple',                  pct: 4.8 },
      { name: 'Microsoft',              pct: 4.3 },
      { name: 'NVIDIA',                 pct: 4.1 },
      { name: 'Amazon',                 pct: 2.5 },
      { name: 'Alphabet (A+C)',         pct: 2.2 },
      { name: 'Meta Platforms',         pct: 1.6 },
      { name: 'Tesla',                  pct: 1.1 },
      { name: 'TSMC',                   pct: 1.0 },
      { name: 'Broadcom',               pct: 0.9 },
      { name: 'Eli Lilly',              pct: 0.8 },
      { name: 'JPMorgan Chase',         pct: 0.8 },
      { name: 'Exxon Mobil',            pct: 0.5 },
      { name: 'Visa',                   pct: 0.5 },
      { name: 'Samsung Electronics',    pct: 0.5 },
      { name: 'ASML Holding',           pct: 0.5 },
      { name: 'UnitedHealth Group',     pct: 0.4 },
      { name: 'Mastercard',             pct: 0.4 },
      { name: 'Novo Nordisk',           pct: 0.4 },
      { name: 'Tencent',                pct: 0.4 },
      { name: 'Costco',                 pct: 0.4 },
      { name: 'Home Depot',             pct: 0.4 },
      { name: 'Oracle',                 pct: 0.3 },
      { name: 'Alibaba',                pct: 0.3 },
      { name: 'Netflix',                pct: 0.3 },
      { name: 'Reliance Industries',    pct: 0.3 },
      { name: 'Berkshire Hathaway B',   pct: 0.3 },
      { name: 'LVMH',                   pct: 0.3 },
      { name: 'SAP',                    pct: 0.3 },
      { name: 'Toyota Motor',           pct: 0.3 },
      { name: 'AstraZeneca',            pct: 0.3 },
    ],
  },

  msci_em_ex_china: {
    assetType: 'equity',
    numHoldings: 700,
    marketType: [
      { type: 'Mercati emergenti', pct: 100 },
    ],
    area: [
      { name: 'Asia Emergente',   pct: 67.5 },
      { name: 'EMEA Emergente',   pct: 16.2 },
      { name: 'America Latina',   pct: 10.4 },
      { name: 'Altro',            pct: 5.9  },
    ],
    factors: { value: 0.4, growth: -0.1, momentum: 0.1, quality: -0.1, size: 0.3, lowVol: 0.1, yield: 0.4 },
    geography: [
      { country: 'India',          pct: 27.3 },
      { country: 'Taiwan',         pct: 22.1 },
      { country: 'Corea del Sud',  pct: 16.4 },
      { country: 'Brasile',        pct: 7.8  },
      { country: 'Arabia Saudita', pct: 4.7  },
      { country: 'Sudafrica',      pct: 3.5  },
      { country: 'Messico',        pct: 2.8  },
      { country: 'Tailandia',      pct: 2.1  },
      { country: 'Indonesia',      pct: 2.0  },
      { country: 'Malesia',        pct: 1.4  },
      { country: 'Altri',          pct: 9.9  },
    ],
    currencies: [
      { code: 'INR', name: 'Rupia indiana',     pct: 27.3 },
      { code: 'TWD', name: 'Dollaro taiwanese', pct: 22.1 },
      { code: 'KRW', name: 'Won sudcoreano',    pct: 16.4 },
      { code: 'BRL', name: 'Real brasiliano',   pct: 7.8  },
      { code: 'SAR', name: 'Riyal saudita',     pct: 4.7  },
      { code: 'Altri', name: 'Altri',           pct: 21.7 },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 28.5 },
      { name: 'Finanza',                pct: 22.1 },
      { name: 'Industria',              pct: 9.8  },
      { name: 'Materiali',              pct: 8.4  },
      { name: 'Energia',                pct: 7.2  },
      { name: 'Beni di consumo',        pct: 6.8  },
      { name: 'Sanità',                 pct: 5.1  },
      { name: 'Consumi discrezionali',  pct: 4.9  },
      { name: 'Comunicazione',          pct: 4.6  },
      { name: 'Utility',                pct: 2.6  },
    ],
    topHoldings: [
      { name: 'TSMC',                    pct: 11.8 },
      { name: 'Samsung Electronics',     pct: 4.7  },
      { name: 'Reliance Industries',     pct: 2.2  },
      { name: 'Infosys',                 pct: 1.8  },
      { name: 'HDFC Bank',               pct: 1.6  },
      { name: 'SK Hynix',                pct: 1.5  },
      { name: 'Tata Consultancy',        pct: 1.2  },
      { name: 'ICICI Bank',              pct: 1.1  },
      { name: 'Vale',                    pct: 1.0  },
      { name: 'Itau Unibanco',           pct: 0.9  },
      { name: 'Hyundai Motor',           pct: 0.8  },
      { name: 'KB Financial Group',      pct: 0.8  },
      { name: 'Bharti Airtel',           pct: 0.7  },
      { name: 'MediaTek',                pct: 0.7  },
      { name: 'Saudi Aramco',            pct: 0.7  },
      { name: 'Petrobras',               pct: 0.6  },
      { name: 'Wipro',                   pct: 0.6  },
      { name: 'HCL Technologies',        pct: 0.6  },
      { name: 'Axis Bank',               pct: 0.5  },
      { name: 'LG Energy Solution',      pct: 0.5  },
      { name: 'Larsen & Toubro',         pct: 0.5  },
      { name: 'Ambev',                   pct: 0.4  },
      { name: 'Woori Financial',         pct: 0.4  },
      { name: 'PTT',                     pct: 0.4  },
      { name: 'POSCO Holdings',          pct: 0.4  },
      { name: 'ITC Limited',             pct: 0.4  },
      { name: 'First Abu Dhabi Bank',    pct: 0.4  },
      { name: 'Al Rajhi Bank',           pct: 0.4  },
      { name: 'Mahindra & Mahindra',     pct: 0.3  },
      { name: 'Sun Pharmaceutical',      pct: 0.3  },
    ],
  },

  msci_china: {
    assetType: 'equity',
    numHoldings: 700,
    marketType: [
      { type: 'Mercati emergenti', pct: 100 },
    ],
    area: [
      { name: 'Asia Emergente', pct: 100 },
    ],
    factors: { value: 0.2, growth: 0.1, momentum: -0.3, quality: -0.2, size: 0.1, lowVol: -0.1, yield: 0.2 },
    geography: [
      { country: 'Cina', pct: 100 },
    ],
    currencies: [
      { code: 'CNY', name: 'Yuan cinese (CNH offshore)', pct: 100 },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 36.5 },
      { name: 'Consumi discrezionali',  pct: 16.8 },
      { name: 'Finanza',                pct: 14.2 },
      { name: 'Comunicazione',          pct: 11.3 },
      { name: 'Beni di consumo',        pct: 6.4  },
      { name: 'Industria',              pct: 5.6  },
      { name: 'Sanità',                 pct: 4.2  },
      { name: 'Energia',                pct: 2.2  },
      { name: 'Materiali',              pct: 1.8  },
      { name: 'Utility',                pct: 1.0  },
    ],
    topHoldings: [
      { name: 'Tencent',                 pct: 15.2 },
      { name: 'Alibaba',                 pct: 10.1 },
      { name: 'Meituan',                 pct: 5.8  },
      { name: 'JD.com',                  pct: 3.9  },
      { name: 'Baidu',                   pct: 3.4  },
      { name: 'Xiaomi',                  pct: 3.1  },
      { name: 'NetEase',                 pct: 2.5  },
      { name: 'BYD',                     pct: 2.3  },
      { name: 'CNOOC',                   pct: 1.8  },
      { name: 'Li Auto',                 pct: 1.6  },
      { name: 'Pinduoduo (PDD)',          pct: 1.5  },
      { name: 'CATL',                    pct: 1.4  },
      { name: 'Kuaishou Technology',     pct: 1.2  },
      { name: 'Ping An Insurance',       pct: 1.1  },
      { name: 'China Construction Bank', pct: 1.0  },
      { name: 'Industrial & Comm. Bank', pct: 0.9  },
      { name: 'China Merchants Bank',    pct: 0.9  },
      { name: 'NIO',                     pct: 0.8  },
      { name: 'Geely Automobile',        pct: 0.7  },
      { name: 'Midea Group',             pct: 0.7  },
    ],
  },

  eur_infl_linked: {
    assetType: 'bond',
    bondInfo: { duration: 9.2, ytm: 1.8, creditRating: 'AA', type: 'Gov EUR Inflation-Linked' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa', pct: 100 },
    ],
    geography: [
      { country: 'Francia',     pct: 36.4 },
      { country: 'Italia',      pct: 26.8 },
      { country: 'Germania',    pct: 19.3 },
      { country: 'Spagna',      pct: 11.2 },
      { country: 'Grecia',      pct: 3.1  },
      { country: 'Altri',       pct: 3.2  },
    ],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: null,
  },

  vanguard_eur_corp: {
    assetType: 'bond',
    bondInfo: { duration: 4.8, ytm: 3.4, creditRating: 'A-', type: 'Corporate EUR Investment Grade' },
    marketType: [
      { type: 'Mercati sviluppati', pct: 100 },
    ],
    area: [
      { name: 'Europa',       pct: 82.3 },
      { name: 'Nord America', pct: 10.4 },
      { name: 'Altro',        pct: 7.3  },
    ],
    geography: [
      { country: 'Francia',        pct: 18.6 },
      { country: 'Germania',       pct: 14.2 },
      { country: 'Paesi Bassi',    pct: 12.1 },
      { country: 'Italia',         pct: 10.8 },
      { country: 'Spagna',         pct: 8.4  },
      { country: 'Lussemburgo',    pct: 7.2  },
      { country: 'Stati Uniti',    pct: 6.8  },
      { country: 'Regno Unito',    pct: 5.9  },
      { country: 'Svezia',         pct: 3.8  },
      { country: 'Altri',          pct: 12.2 },
    ],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: null,
  },

  // ── Nuovi profili — espansione maggio 2026 ──────────────────────────────────

  stoxx_europe_600: {
    assetType: 'equity',
    numHoldings: 600,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 0.3, growth: 0.0, momentum: 0.0, quality: 0.2, size: -0.1, lowVol: 0.1, yield: 0.3 },
    geography: [
      { country: 'Regno Unito',    pct: 22.5 },
      { country: 'Francia',        pct: 16.8 },
      { country: 'Svizzera',       pct: 14.2 },
      { country: 'Germania',       pct: 13.5 },
      { country: 'Paesi Bassi',    pct: 7.4  },
      { country: 'Danimarca',      pct: 5.1  },
      { country: 'Svezia',         pct: 4.8  },
      { country: 'Spagna',         pct: 4.2  },
      { country: 'Italia',         pct: 3.6  },
      { country: 'Finlandia',      pct: 2.1  },
      { country: 'Altri',          pct: 5.8  },
    ],
    currencies: [
      { code: 'GBP', name: 'Sterlina',            pct: 22.5 },
      { code: 'EUR', name: 'Euro',                pct: 56.0 },
      { code: 'CHF', name: 'Franco svizzero',     pct: 14.2 },
      { code: 'DKK', name: 'Corona danese',       pct: 5.1  },
      { code: 'SEK', name: 'Corona svedese',      pct: 4.8  },
      { code: 'NOK', name: 'Corona norvegese',    pct: 2.4  },
      { code: 'Altri', name: 'Altri',             pct: 2.4  },
    ],
    sectors: [
      { name: 'Finanza',                pct: 18.2 },
      { name: 'Sanità',                 pct: 16.1 },
      { name: 'Industria',              pct: 14.8 },
      { name: 'Beni di consumo',        pct: 12.6 },
      { name: 'Tecnologia',             pct: 10.2 },
      { name: 'Consumi discrezionali',  pct: 9.8  },
      { name: 'Materiali',              pct: 6.7  },
      { name: 'Energia',                pct: 4.2  },
      { name: 'Utility',                pct: 3.8  },
      { name: 'Comunicazione',          pct: 3.6  },
    ],
    topHoldings: [
      { name: 'Novo Nordisk',        pct: 4.8 },
      { name: 'ASML Holding',        pct: 3.9 },
      { name: 'Nestlé',              pct: 3.1 },
      { name: 'AstraZeneca',         pct: 2.8 },
      { name: 'LVMH',                pct: 2.5 },
      { name: 'SAP',                 pct: 2.3 },
      { name: 'Shell',               pct: 2.2 },
      { name: 'Roche',               pct: 2.0 },
      { name: 'Novartis',            pct: 1.9 },
      { name: 'Hermès',              pct: 1.8 },
      { name: 'HSBC',                pct: 1.7 },
      { name: 'Siemens',             pct: 1.7 },
      { name: 'Unilever',            pct: 1.5 },
      { name: 'Allianz',             pct: 1.4 },
      { name: 'Schneider Electric',  pct: 1.4 },
      { name: 'Richemont',           pct: 1.3 },
      { name: 'TotalEnergies',       pct: 1.3 },
      { name: 'L\'Oréal',            pct: 1.2 },
      { name: 'BNP Paribas',         pct: 1.1 },
      { name: 'Rolls-Royce',         pct: 1.0 },
      { name: 'AbbVie',              pct: 0.9 },
      { name: 'Airbus',              pct: 0.9 },
      { name: 'Sanofi',              pct: 0.8 },
      { name: 'Deutsche Telekom',    pct: 0.8 },
      { name: 'Ferrari',             pct: 0.7 },
    ],
  },

  msci_world_min_vol: {
    assetType: 'equity',
    numHoldings: 290,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [
      { name: 'Nord America', pct: 56.0 },
      { name: 'Europa',       pct: 25.5 },
      { name: 'Giappone',     pct: 9.8  },
      { name: 'Asia Pacifico',pct: 5.2  },
      { name: 'Altro',        pct: 3.5  },
    ],
    factors: { value: 0.2, growth: -0.2, momentum: 0.0, quality: 0.5, size: -0.1, lowVol: 1.5, yield: 0.5 },
    geography: [
      { country: 'Stati Uniti',    pct: 53.8 },
      { country: 'Giappone',       pct: 9.8  },
      { country: 'Francia',        pct: 4.8  },
      { country: 'Canada',         pct: 4.3  },
      { country: 'Svizzera',       pct: 4.1  },
      { country: 'Hong Kong',      pct: 3.8  },
      { country: 'Australia',      pct: 3.2  },
      { country: 'Singapore',      pct: 2.9  },
      { country: 'Germania',       pct: 2.4  },
      { country: 'Danimarca',      pct: 2.3  },
      { country: 'Altri',          pct: 8.6  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',          pct: 53.8 },
      { code: 'EUR', name: 'Euro',                 pct: 15.0 },
      { code: 'JPY', name: 'Yen giapponese',       pct: 9.8  },
      { code: 'CAD', name: 'Dollaro canadese',     pct: 4.3  },
      { code: 'CHF', name: 'Franco svizzero',      pct: 4.1  },
      { code: 'HKD', name: 'Dollaro Hong Kong',    pct: 3.8  },
      { code: 'AUD', name: 'Dollaro australiano',  pct: 3.2  },
      { code: 'SGD', name: 'Dollaro singaporeano', pct: 2.9  },
      { code: 'DKK', name: 'Corona danese',        pct: 2.3  },
      { code: 'Altri', name: 'Altri',              pct: 0.8  },
    ],
    sectors: [
      { name: 'Utility',                pct: 18.5 },
      { name: 'Beni di consumo',        pct: 16.8 },
      { name: 'Sanità',                 pct: 15.2 },
      { name: 'Finanza',                pct: 13.8 },
      { name: 'Comunicazione',          pct: 8.6  },
      { name: 'Industria',              pct: 8.2  },
      { name: 'Tecnologia',             pct: 7.9  },
      { name: 'Immobiliare',            pct: 5.4  },
      { name: 'Materiali',              pct: 3.8  },
      { name: 'Consumi discrezionali',  pct: 1.8  },
    ],
    topHoldings: [
      { name: 'Coca-Cola',          pct: 1.8 },
      { name: 'Procter & Gamble',   pct: 1.7 },
      { name: 'Verizon',            pct: 1.5 },
      { name: 'McDonald\'s',        pct: 1.4 },
      { name: 'Colgate-Palmolive',  pct: 1.3 },
      { name: 'NextEra Energy',     pct: 1.3 },
      { name: 'Johnson & Johnson',  pct: 1.2 },
      { name: 'Kimberly-Clark',     pct: 1.1 },
      { name: 'Waste Management',   pct: 1.1 },
      { name: 'Novartis',           pct: 1.0 },
    ],
  },

  msci_world_value: {
    assetType: 'equity',
    numHoldings: 400,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [
      { name: 'Nord America', pct: 62.5 },
      { name: 'Europa',       pct: 24.8 },
      { name: 'Giappone',     pct: 8.2  },
      { name: 'Asia Pacifico',pct: 3.1  },
      { name: 'Altro',        pct: 1.4  },
    ],
    factors: { value: 1.2, growth: -0.6, momentum: -0.3, quality: -0.1, size: -0.1, lowVol: 0.3, yield: 0.8 },
    geography: [
      { country: 'Stati Uniti',    pct: 59.8 },
      { country: 'Giappone',       pct: 8.2  },
      { country: 'Regno Unito',    pct: 6.8  },
      { country: 'Canada',         pct: 5.4  },
      { country: 'Francia',        pct: 4.2  },
      { country: 'Germania',       pct: 3.5  },
      { country: 'Australia',      pct: 2.8  },
      { country: 'Svizzera',       pct: 2.1  },
      { country: 'Paesi Bassi',    pct: 2.0  },
      { country: 'Altri',          pct: 5.2  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',         pct: 59.8 },
      { code: 'EUR', name: 'Euro',                pct: 13.5 },
      { code: 'JPY', name: 'Yen giapponese',      pct: 8.2  },
      { code: 'GBP', name: 'Sterlina',            pct: 6.8  },
      { code: 'CAD', name: 'Dollaro canadese',    pct: 5.4  },
      { code: 'AUD', name: 'Dollaro australiano', pct: 2.8  },
      { code: 'CHF', name: 'Franco svizzero',     pct: 2.1  },
      { code: 'Altri', name: 'Altri',             pct: 1.4  },
    ],
    sectors: [
      { name: 'Finanza',                pct: 25.8 },
      { name: 'Energia',                pct: 12.4 },
      { name: 'Industria',              pct: 11.2 },
      { name: 'Beni di consumo',        pct: 10.8 },
      { name: 'Sanità',                 pct: 9.5  },
      { name: 'Materiali',              pct: 8.6  },
      { name: 'Tecnologia',             pct: 7.2  },
      { name: 'Utility',                pct: 6.4  },
      { name: 'Consumi discrezionali',  pct: 5.1  },
      { name: 'Comunicazione',          pct: 3.0  },
    ],
    topHoldings: [
      { name: 'JPMorgan Chase',       pct: 2.4 },
      { name: 'Berkshire Hathaway B', pct: 2.1 },
      { name: 'Exxon Mobil',          pct: 1.9 },
      { name: 'Bank of America',      pct: 1.6 },
      { name: 'Chevron',              pct: 1.5 },
      { name: 'Wells Fargo',          pct: 1.3 },
      { name: 'Johnson & Johnson',    pct: 1.2 },
      { name: 'Citigroup',            pct: 1.1 },
      { name: 'Toyota',               pct: 1.0 },
      { name: 'Shell',                pct: 0.9 },
    ],
  },

  msci_world_esg: {
    assetType: 'equity',
    numHoldings: 700,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [
      { name: 'Nord America', pct: 68.0 },
      { name: 'Europa',       pct: 22.5 },
      { name: 'Giappone',     pct: 5.2  },
      { name: 'Asia Pacifico',pct: 3.0  },
      { name: 'Altro',        pct: 1.3  },
    ],
    factors: { value: -0.3, growth: 0.5, momentum: 0.2, quality: 0.6, size: -0.2, lowVol: 0.0, yield: -0.3 },
    geography: [
      { country: 'Stati Uniti',    pct: 65.2 },
      { country: 'Giappone',       pct: 5.2  },
      { country: 'Francia',        pct: 4.1  },
      { country: 'Canada',         pct: 3.8  },
      { country: 'Danimarca',      pct: 3.6  },
      { country: 'Germania',       pct: 3.2  },
      { country: 'Svizzera',       pct: 2.9  },
      { country: 'Paesi Bassi',    pct: 2.6  },
      { country: 'Regno Unito',    pct: 2.1  },
      { country: 'Svezia',         pct: 2.0  },
      { country: 'Altri',          pct: 5.3  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',      pct: 65.2 },
      { code: 'EUR', name: 'Euro',             pct: 16.5 },
      { code: 'JPY', name: 'Yen giapponese',   pct: 5.2  },
      { code: 'CAD', name: 'Dollaro canadese', pct: 3.8  },
      { code: 'CHF', name: 'Franco svizzero',  pct: 2.9  },
      { code: 'DKK', name: 'Corona danese',    pct: 3.6  },
      { code: 'GBP', name: 'Sterlina',         pct: 2.1  },
      { code: 'Altri', name: 'Altri',          pct: 0.7  },
    ],
    sectors: [
      { name: 'Tecnologia',             pct: 28.5 },
      { name: 'Sanità',                 pct: 14.2 },
      { name: 'Finanza',                pct: 12.8 },
      { name: 'Industria',              pct: 11.4 },
      { name: 'Consumi discrezionali',  pct: 9.6  },
      { name: 'Comunicazione',          pct: 8.4  },
      { name: 'Beni di consumo',        pct: 6.8  },
      { name: 'Materiali',              pct: 4.2  },
      { name: 'Utility',                pct: 2.8  },
      { name: 'Energia',                pct: 1.3  },
    ],
    topHoldings: [
      { name: 'Microsoft',      pct: 5.8 },
      { name: 'NVIDIA',         pct: 5.1 },
      { name: 'Apple',          pct: 4.9 },
      { name: 'Novo Nordisk',   pct: 3.2 },
      { name: 'Alphabet A',     pct: 2.4 },
      { name: 'Amazon',         pct: 2.3 },
      { name: 'Meta Platforms', pct: 2.0 },
      { name: 'Visa',           pct: 1.8 },
      { name: 'ASML Holding',   pct: 1.7 },
      { name: 'Mastercard',     pct: 1.5 },
    ],
  },

  msci_india: {
    assetType: 'equity',
    numHoldings: 145,
    marketType: [{ type: 'Mercati emergenti', pct: 100 }],
    area: [{ name: 'Asia', pct: 100 }],
    factors: { value: 0.1, growth: 0.7, momentum: 0.5, quality: 0.4, size: -0.2, lowVol: -0.3, yield: -0.1 },
    geography: [{ country: 'India', pct: 100 }],
    currencies: [{ code: 'INR', name: 'Rupia indiana', pct: 100 }],
    sectors: [
      { name: 'Finanza',                pct: 27.8 },
      { name: 'Tecnologia',             pct: 18.6 },
      { name: 'Energia',                pct: 11.4 },
      { name: 'Beni di consumo',        pct: 9.8  },
      { name: 'Industria',              pct: 8.5  },
      { name: 'Sanità',                 pct: 6.4  },
      { name: 'Materiali',              pct: 5.9  },
      { name: 'Consumi discrezionali',  pct: 5.8  },
      { name: 'Comunicazione',          pct: 3.4  },
      { name: 'Utility',                pct: 2.4  },
    ],
    topHoldings: [
      { name: 'Reliance Industries',  pct: 8.6 },
      { name: 'Infosys',              pct: 6.2 },
      { name: 'HDFC Bank',            pct: 5.8 },
      { name: 'ICICI Bank',           pct: 5.2 },
      { name: 'Tata Consultancy',     pct: 4.8 },
      { name: 'Bharti Airtel',        pct: 3.2 },
      { name: 'Hindustan Unilever',   pct: 2.8 },
      { name: 'Kotak Mahindra Bank',  pct: 2.6 },
      { name: 'Larsen & Toubro',      pct: 2.4 },
      { name: 'Bajaj Finance',        pct: 2.1 },
    ],
  },

  clean_energy: {
    assetType: 'equity',
    numHoldings: 100,
    marketType: [
      { type: 'Mercati sviluppati', pct: 75 },
      { type: 'Mercati emergenti',  pct: 25 },
    ],
    area: [
      { name: 'Asia',         pct: 28.0 },
      { name: 'Nord America', pct: 25.0 },
      { name: 'Europa',       pct: 43.0 },
      { name: 'Altro',        pct: 4.0  },
    ],
    factors: { value: -0.5, growth: 0.8, momentum: -0.3, quality: 0.0, size: 0.2, lowVol: -0.6, yield: -0.2 },
    geography: [
      { country: 'Danimarca',       pct: 10.5 },
      { country: 'Cina',            pct: 10.2 },
      { country: 'Stati Uniti',     pct: 9.8  },
      { country: 'Portogallo',      pct: 7.2  },
      { country: 'Spagna',          pct: 6.8  },
      { country: 'Corea del Sud',   pct: 6.4  },
      { country: 'Germania',        pct: 5.8  },
      { country: 'Canada',          pct: 5.2  },
      { country: 'Italia',          pct: 4.8  },
      { country: 'Taiwan',          pct: 4.1  },
      { country: 'Altri',           pct: 29.2 },
    ],
    currencies: [
      { code: 'EUR', name: 'Euro',           pct: 38.0 },
      { code: 'USD', name: 'Dollaro USA',    pct: 15.0 },
      { code: 'KRW', name: 'Won coreano',    pct: 6.4  },
      { code: 'CNY', name: 'Yuan cinese',    pct: 10.2 },
      { code: 'DKK', name: 'Corona danese', pct: 10.5 },
      { code: 'CAD', name: 'Dollaro canadese', pct: 5.2 },
      { code: 'TWD', name: 'Dollaro taiwanese', pct: 4.1 },
      { code: 'Altri', name: 'Altri',        pct: 10.6 },
    ],
    sectors: [
      { name: 'Utility',    pct: 45.2 },
      { name: 'Energia',    pct: 22.8 },
      { name: 'Industria',  pct: 18.6 },
      { name: 'Tecnologia', pct: 8.4  },
      { name: 'Materiali',  pct: 5.0  },
    ],
    topHoldings: [
      { name: 'Vestas Wind Systems', pct: 8.2 },
      { name: 'Orsted',              pct: 7.1 },
      { name: 'First Solar',         pct: 6.4 },
      { name: 'Enphase Energy',      pct: 5.8 },
      { name: 'EDP Renovaveis',      pct: 4.2 },
      { name: 'Iberdrola',           pct: 3.8 },
      { name: 'BYD',                 pct: 3.5 },
      { name: 'Enel',                pct: 3.2 },
      { name: 'Siemens Gamesa',      pct: 3.0 },
      { name: 'SolarEdge',           pct: 2.8 },
    ],
  },

  automation_robotics: {
    assetType: 'equity',
    numHoldings: 150,
    marketType: [
      { type: 'Mercati sviluppati', pct: 85 },
      { type: 'Mercati emergenti',  pct: 15 },
    ],
    area: [
      { name: 'Nord America', pct: 40.0 },
      { name: 'Asia',         pct: 38.0 },
      { name: 'Europa',       pct: 18.0 },
      { name: 'Altro',        pct: 4.0  },
    ],
    factors: { value: -0.3, growth: 1.0, momentum: 0.4, quality: 0.3, size: 0.1, lowVol: -0.5, yield: -0.5 },
    geography: [
      { country: 'Stati Uniti',   pct: 38.5 },
      { country: 'Giappone',      pct: 22.8 },
      { country: 'Corea del Sud', pct: 8.2  },
      { country: 'Germania',      pct: 6.4  },
      { country: 'Cina',          pct: 5.8  },
      { country: 'Svizzera',      pct: 4.2  },
      { country: 'Francia',       pct: 3.8  },
      { country: 'Taiwan',        pct: 3.4  },
      { country: 'Paesi Bassi',   pct: 2.8  },
      { country: 'Altri',         pct: 4.1  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',       pct: 38.5 },
      { code: 'JPY', name: 'Yen giapponese',    pct: 22.8 },
      { code: 'KRW', name: 'Won coreano',       pct: 8.2  },
      { code: 'EUR', name: 'Euro',              pct: 17.2 },
      { code: 'CHF', name: 'Franco svizzero',   pct: 4.2  },
      { code: 'TWD', name: 'Dollaro taiwanese', pct: 3.4  },
      { code: 'Altri', name: 'Altri',           pct: 5.7  },
    ],
    sectors: [
      { name: 'Tecnologia', pct: 48.5 },
      { name: 'Industria',  pct: 38.2 },
      { name: 'Sanità',     pct: 7.4  },
      { name: 'Consumi discrezionali', pct: 5.9 },
    ],
    topHoldings: [
      { name: 'Intuitive Surgical',  pct: 5.8 },
      { name: 'Keyence',             pct: 5.2 },
      { name: 'Fanuc',               pct: 4.8 },
      { name: 'ABB',                 pct: 4.5 },
      { name: 'NVIDIA',              pct: 4.2 },
      { name: 'Siemens',             pct: 3.8 },
      { name: 'SMC Corporation',     pct: 3.5 },
      { name: 'Yaskawa Electric',    pct: 3.2 },
      { name: 'Rockwell Automation', pct: 2.9 },
      { name: 'Zebra Technologies',  pct: 2.6 },
    ],
  },

  silver_spot: {
    assetType: 'commodity',
    _commodityType: 'precious_metal', // simile all'oro: bassa correlazione con equity
    geography: [{ country: 'Globale', pct: 100 }],
    currencies: [{ code: 'USD', name: 'Dollaro USA', pct: 100 }],
    sectors: null,
    factors: null,
  },

  ftse_mib: {
    assetType: 'equity',
    numHoldings: 40,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 0.7, growth: -0.1, momentum: 0.1, quality: 0.1, size: -0.3, lowVol: -0.3, yield: 0.8 },
    geography: [{ country: 'Italia', pct: 100 }],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: [
      { name: 'Finanza',                pct: 32.4 },
      { name: 'Energia',                pct: 15.8 },
      { name: 'Utility',                pct: 12.6 },
      { name: 'Industria',              pct: 10.2 },
      { name: 'Beni di consumo',        pct: 8.5  },
      { name: 'Consumi discrezionali',  pct: 7.2  },
      { name: 'Sanità',                 pct: 5.8  },
      { name: 'Comunicazione',          pct: 4.5  },
      { name: 'Materiali',              pct: 3.0  },
    ],
    topHoldings: [
      { name: 'Intesa Sanpaolo', pct: 9.8 },
      { name: 'Unicredit',       pct: 9.2 },
      { name: 'Enel',            pct: 8.5 },
      { name: 'ENI',             pct: 7.8 },
      { name: 'Ferrari',         pct: 6.4 },
      { name: 'Generali',        pct: 5.2 },
      { name: 'Mediobanca',      pct: 3.8 },
      { name: 'Leonardo',        pct: 3.4 },
      { name: 'Stellantis',      pct: 3.1 },
      { name: 'Prysmian',        pct: 2.8 },
    ],
  },

  em_latin_america: {
    assetType: 'equity',
    numHoldings: 120,
    marketType: [{ type: 'Mercati emergenti', pct: 100 }],
    area: [{ name: 'America Latina', pct: 100 }],
    factors: { value: 0.6, growth: 0.1, momentum: -0.1, quality: -0.1, size: 0.2, lowVol: -0.5, yield: 0.5 },
    geography: [
      { country: 'Brasile',   pct: 58.4 },
      { country: 'Messico',   pct: 22.8 },
      { country: 'Cile',      pct: 8.4  },
      { country: 'Colombia',  pct: 4.2  },
      { country: 'Perù',      pct: 3.8  },
      { country: 'Argentina', pct: 2.4  },
    ],
    currencies: [
      { code: 'BRL', name: 'Real brasiliano', pct: 58.4 },
      { code: 'MXN', name: 'Peso messicano',  pct: 22.8 },
      { code: 'CLP', name: 'Peso cileno',     pct: 8.4  },
      { code: 'COP', name: 'Peso colombiano', pct: 4.2  },
      { code: 'PEN', name: 'Sol peruviano',   pct: 3.8  },
      { code: 'ARS', name: 'Peso argentino',  pct: 2.4  },
    ],
    sectors: [
      { name: 'Finanza',     pct: 24.8 },
      { name: 'Energia',     pct: 18.6 },
      { name: 'Materiali',   pct: 16.4 },
      { name: 'Beni di consumo', pct: 12.2 },
      { name: 'Utility',     pct: 9.8  },
      { name: 'Industria',   pct: 7.4  },
      { name: 'Comunicazione', pct: 5.8 },
      { name: 'Tecnologia',  pct: 4.0  },
      { name: 'Immobiliare', pct: 1.0  },
    ],
    topHoldings: [
      { name: 'Vale',              pct: 8.4 },
      { name: 'Petrobras',         pct: 7.8 },
      { name: 'Itaú Unibanco',     pct: 5.2 },
      { name: 'Banco Bradesco',    pct: 3.8 },
      { name: 'América Móvil',     pct: 3.6 },
      { name: 'Grupo Mexico',      pct: 3.2 },
      { name: 'WEG',               pct: 2.8 },
      { name: 'Banorte',           pct: 2.4 },
      { name: 'Ambev',             pct: 2.2 },
      { name: 'Femsa',             pct: 2.0 },
    ],
  },

  btp_italy: {
    assetType: 'bond',
    bondInfo: { duration: 5.8, ytm: 3.6, creditRating: 'BBB', type: 'Titoli di Stato Italiani (BTP)' },
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    geography: [{ country: 'Italia', pct: 100 }],
    currencies: [{ code: 'EUR', name: 'Euro', pct: 100 }],
    sectors: null,
  },

  msci_world_multifactor: {
    assetType: 'equity',
    numHoldings: 350,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [
      { name: 'Nord America', pct: 60.0 },
      { name: 'Europa',       pct: 26.0 },
      { name: 'Giappone',     pct: 9.0  },
      { name: 'Asia Pacifico',pct: 4.0  },
      { name: 'Altro',        pct: 1.0  },
    ],
    factors: { value: 0.5, growth: 0.3, momentum: 0.6, quality: 0.5, size: 0.4, lowVol: 0.3, yield: 0.3 },
    geography: [
      { country: 'Stati Uniti',    pct: 57.5 },
      { country: 'Giappone',       pct: 9.0  },
      { country: 'Regno Unito',    pct: 6.2  },
      { country: 'Francia',        pct: 5.5  },
      { country: 'Canada',         pct: 4.8  },
      { country: 'Germania',       pct: 4.2  },
      { country: 'Svizzera',       pct: 3.8  },
      { country: 'Australia',      pct: 3.2  },
      { country: 'Paesi Bassi',    pct: 2.8  },
      { country: 'Altri',          pct: 3.0  },
    ],
    currencies: [
      { code: 'USD', name: 'Dollaro USA',      pct: 57.5 },
      { code: 'EUR', name: 'Euro',             pct: 19.5 },
      { code: 'JPY', name: 'Yen giapponese',   pct: 9.0  },
      { code: 'GBP', name: 'Sterlina',         pct: 6.2  },
      { code: 'CAD', name: 'Dollaro canadese', pct: 4.8  },
      { code: 'CHF', name: 'Franco svizzero',  pct: 3.0  },
    ],
    sectors: [
      { name: 'Finanza',                pct: 18.5 },
      { name: 'Tecnologia',             pct: 16.8 },
      { name: 'Sanità',                 pct: 14.2 },
      { name: 'Industria',              pct: 13.6 },
      { name: 'Beni di consumo',        pct: 10.4 },
      { name: 'Consumi discrezionali',  pct: 9.2  },
      { name: 'Comunicazione',          pct: 6.8  },
      { name: 'Energia',                pct: 4.8  },
      { name: 'Materiali',              pct: 4.2  },
      { name: 'Utility',                pct: 1.5  },
    ],
    topHoldings: [
      { name: 'Microsoft',          pct: 2.2 },
      { name: 'Apple',              pct: 2.0 },
      { name: 'NVIDIA',             pct: 1.9 },
      { name: 'JPMorgan Chase',     pct: 1.6 },
      { name: 'UnitedHealth Group', pct: 1.4 },
      { name: 'Exxon Mobil',        pct: 1.3 },
      { name: 'Berkshire Hathaway', pct: 1.2 },
      { name: 'Johnson & Johnson',  pct: 1.1 },
      { name: 'Novo Nordisk',       pct: 1.0 },
      { name: 'Visa',               pct: 0.9 },
    ],
  },

  // ── UK single stock profiles ────────────────────────────────────────────────
  uk_stock_energy_gbp: {
    assetType: 'equity', _isDirectStock: true,
    geography: [{ country: 'Regno Unito', pct: 100 }],
    currencies: [{ code: 'GBP', name: 'Sterlina', pct: 100 }],
    sectors: [{ name: 'Energia', pct: 100 }],
    factors: { value: 0.7, growth: -0.2, momentum: 0.0, quality: 0.2, size: -0.8, lowVol: -0.2, yield: 0.8 },
  },
  uk_stock_finance_gbp: {
    assetType: 'equity', _isDirectStock: true,
    geography: [{ country: 'Regno Unito', pct: 100 }],
    currencies: [{ code: 'GBP', name: 'Sterlina', pct: 100 }],
    sectors: [{ name: 'Finanza', pct: 100 }],
    factors: { value: 0.6, growth: -0.1, momentum: 0.1, quality: 0.2, size: -0.7, lowVol: -0.1, yield: 0.7 },
  },
  uk_stock_health_gbp: {
    assetType: 'equity', _isDirectStock: true,
    geography: [{ country: 'Regno Unito', pct: 100 }],
    currencies: [{ code: 'GBP', name: 'Sterlina', pct: 100 }],
    sectors: [{ name: 'Sanità', pct: 100 }],
    factors: { value: 0.1, growth: 0.4, momentum: 0.0, quality: 0.6, size: -0.7, lowVol: 0.3, yield: 0.3 },
  },
  uk_stock_materials_gbp: {
    assetType: 'equity', _isDirectStock: true,
    geography: [{ country: 'Regno Unito', pct: 100 }],
    currencies: [{ code: 'GBP', name: 'Sterlina', pct: 100 }],
    sectors: [{ name: 'Materiali', pct: 100 }],
    factors: { value: 0.5, growth: 0.1, momentum: 0.1, quality: 0.1, size: -0.6, lowVol: -0.2, yield: 0.5 },
  },
  uk_stock_comm_gbp: {
    assetType: 'equity', _isDirectStock: true,
    geography: [{ country: 'Regno Unito', pct: 100 }],
    currencies: [{ code: 'GBP', name: 'Sterlina', pct: 100 }],
    sectors: [{ name: 'Comunicazione', pct: 100 }],
    factors: { value: 0.4, growth: -0.2, momentum: -0.3, quality: 0.1, size: -0.6, lowVol: 0.0, yield: 0.6 },
  },

  // ── Nuovi profili tematici — espansione giugno 2026 ──────────────────────────

  global_healthcare: {
    assetType: 'equity',
    numHoldings: 110,
    marketType: [{ type: 'Mercati sviluppati', pct: 92 }, { type: 'Mercati emergenti', pct: 8 }],
    area: [{ name: 'Nord America', pct: 62 }, { name: 'Europa', pct: 24 }, { name: 'Asia Pacifico', pct: 12 }, { name: 'Altro', pct: 2 }],
    factors: { value: 0.1, growth: 0.5, momentum: 0.1, quality: 0.8, size: -0.5, lowVol: 0.6, yield: 0.2 },
    geography: [
      { country: 'Stati Uniti', pct: 59.4 }, { country: 'Danimarca', pct: 8.2 },
      { country: 'Regno Unito', pct: 5.8 },  { country: 'Svizzera', pct: 5.4 },
      { country: 'Giappone', pct: 4.8 },     { country: 'Francia', pct: 3.2 },
      { country: 'Germania', pct: 2.8 },     { country: 'Altri', pct: 10.4 },
    ],
    currencies: [{ code: 'USD', pct: 59 }, { code: 'EUR', pct: 22 }, { code: 'GBP', pct: 6 }, { code: 'Altri', pct: 13 }],
    sectors: [{ name: 'Farmaceutica', pct: 38.5 }, { name: 'Biotech', pct: 22.3 }, { name: 'Dispositivi medici', pct: 20.8 }, { name: 'Servizi sanitari', pct: 12.6 }, { name: 'Altro', pct: 5.8 }],
    topHoldings: [
      { name: 'Eli Lilly', pct: 9.2 }, { name: 'UnitedHealth', pct: 6.8 }, { name: 'Novo Nordisk', pct: 6.4 },
      { name: 'AbbVie', pct: 5.1 },    { name: 'Johnson & Johnson', pct: 4.8 }, { name: 'Novartis', pct: 3.6 },
    ],
  },

  cybersecurity: {
    assetType: 'equity',
    numHoldings: 80,
    marketType: [{ type: 'Mercati sviluppati', pct: 96 }, { type: 'Mercati emergenti', pct: 4 }],
    area: [{ name: 'Nord America', pct: 78 }, { name: 'Europa', pct: 8 }, { name: 'Asia Pacifico', pct: 10 }, { name: 'Altro', pct: 4 }],
    factors: { value: -0.8, growth: 1.2, momentum: 0.6, quality: 0.4, size: -0.3, lowVol: -0.6, yield: -0.8 },
    geography: [
      { country: 'Stati Uniti', pct: 76.4 }, { country: 'Israele', pct: 8.2 },
      { country: 'Regno Unito', pct: 4.1 },  { country: 'Giappone', pct: 3.8 },
      { country: 'Canada', pct: 2.6 },       { country: 'Altri', pct: 4.9 },
    ],
    currencies: [{ code: 'USD', pct: 79 }, { code: 'ILS', pct: 8 }, { code: 'Altri', pct: 13 }],
    sectors: [{ name: 'Tecnologia', pct: 92.4 }, { name: 'Comunicazione', pct: 5.8 }, { name: 'Altro', pct: 1.8 }],
    topHoldings: [
      { name: 'Palo Alto Networks', pct: 8.6 }, { name: 'CrowdStrike', pct: 7.8 }, { name: 'Fortinet', pct: 6.2 },
      { name: 'Zscaler', pct: 5.4 },            { name: 'Check Point', pct: 4.8 }, { name: 'SentinelOne', pct: 3.9 },
    ],
  },

  water_global: {
    assetType: 'equity',
    _isSectorETF: true, _theme: 'Water',
    numHoldings: 55,
    marketType: [{ type: 'Mercati sviluppati', pct: 94 }, { type: 'Mercati emergenti', pct: 6 }],
    area: [{ name: 'Nord America', pct: 52 }, { name: 'Europa', pct: 36 }, { name: 'Asia Pacifico', pct: 10 }, { name: 'Altro', pct: 2 }],
    factors: { value: 0.3, growth: 0.2, momentum: 0.0, quality: 0.6, size: -0.3, lowVol: 0.7, yield: 0.5 },
    geography: [
      { country: 'Stati Uniti', pct: 48.6 }, { country: 'Francia', pct: 10.2 },
      { country: 'Regno Unito', pct: 8.8 },  { country: 'Svizzera', pct: 7.4 },
      { country: 'Germania', pct: 5.6 },     { country: 'Giappone', pct: 4.2 },
      { country: 'Altri', pct: 15.2 },
    ],
    currencies: [{ code: 'USD', pct: 48 }, { code: 'EUR', pct: 30 }, { code: 'GBP', pct: 9 }, { code: 'Altri', pct: 13 }],
    sectors: [{ name: 'Utility', pct: 38.2 }, { name: 'Industria', pct: 34.8 }, { name: 'Materiali', pct: 12.4 }, { name: 'Tecnologia', pct: 8.6 }, { name: 'Altro', pct: 6.0 }],
    topHoldings: [
      { name: 'Xylem', pct: 7.8 }, { name: 'Veolia Environment', pct: 6.4 }, { name: 'Ecolab', pct: 5.9 },
      { name: 'Pentair', pct: 5.2 }, { name: 'American Water Works', pct: 4.8 },
    ],
  },

  semiconductors: {
    assetType: 'equity',
    _isSectorETF: true, _theme: 'Semiconduttori',
    numHoldings: 50,
    marketType: [{ type: 'Mercati sviluppati', pct: 88 }, { type: 'Mercati emergenti', pct: 12 }],
    area: [{ name: 'Nord America', pct: 58 }, { name: 'Asia Pacifico', pct: 36 }, { name: 'Europa', pct: 6 }],
    factors: { value: -0.4, growth: 1.4, momentum: 0.8, quality: 0.5, size: -0.5, lowVol: -0.8, yield: -0.4 },
    geography: [
      { country: 'Stati Uniti', pct: 55.8 }, { country: 'Taiwan', pct: 14.6 },
      { country: 'Paesi Bassi', pct: 8.2 },  { country: 'Corea del Sud', pct: 7.4 },
      { country: 'Giappone', pct: 4.8 },     { country: 'Altri', pct: 9.2 },
    ],
    currencies: [{ code: 'USD', pct: 56 }, { code: 'TWD', pct: 15 }, { code: 'EUR', pct: 8 }, { code: 'Altri', pct: 21 }],
    sectors: [{ name: 'Semiconduttori', pct: 78.4 }, { name: 'Apparecchiature semicon.', pct: 14.2 }, { name: 'Tecnologia', pct: 7.4 }],
    topHoldings: [
      { name: 'NVIDIA', pct: 18.4 }, { name: 'TSMC', pct: 10.2 }, { name: 'ASML', pct: 8.6 },
      { name: 'Broadcom', pct: 7.4 }, { name: 'AMD', pct: 6.8 }, { name: 'Qualcomm', pct: 5.2 },
    ],
  },

  copper_miners: {
    assetType: 'equity',
    _isSectorETF: true, _theme: 'Copper Miners',
    numHoldings: 40,
    marketType: [{ type: 'Mercati sviluppati', pct: 62 }, { type: 'Mercati emergenti', pct: 38 }],
    area: [{ name: 'Nord America', pct: 40 }, { name: 'America Latina', pct: 22 }, { name: 'Asia Pacifico', pct: 20 }, { name: 'Europa', pct: 10 }, { name: 'Altro', pct: 8 }],
    factors: { value: 0.6, growth: -0.1, momentum: 0.2, quality: -0.2, size: -0.4, lowVol: -0.9, yield: 0.4 },
    geography: [
      { country: 'Canada', pct: 24.5 }, { country: 'Stati Uniti', pct: 15.8 },
      { country: 'Australia', pct: 14.2 }, { country: 'Cina', pct: 10.6 },
      { country: 'Perù', pct: 6.4 }, { country: 'Regno Unito', pct: 5.8 }, { country: 'Altri', pct: 22.7 },
    ],
    currencies: [{ code: 'USD', pct: 46 }, { code: 'CAD', pct: 20 }, { code: 'AUD', pct: 14 }, { code: 'Altri', pct: 20 }],
    sectors: [{ name: 'Materiali', pct: 96.5 }, { name: 'Industria', pct: 3.5 }],
    topHoldings: [
      { name: 'Freeport-McMoRan', pct: 8.2 }, { name: 'BHP Group', pct: 7.4 }, { name: 'Southern Copper', pct: 6.8 },
      { name: 'Glencore', pct: 5.9 }, { name: 'First Quantum', pct: 5.1 },
    ],
  },

  dividend_aristocrats: {
    assetType: 'equity',
    numHoldings: 65,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 88 }, { name: 'Europa', pct: 8 }, { name: 'Asia Pacifico', pct: 4 }],
    factors: { value: 0.6, growth: -0.1, momentum: -0.1, quality: 0.8, size: -0.6, lowVol: 0.6, yield: 1.0 },
    geography: [
      { country: 'Stati Uniti', pct: 84.2 }, { country: 'Canada', pct: 4.6 },
      { country: 'Regno Unito', pct: 4.2 },  { country: 'Svizzera', pct: 2.8 },
      { country: 'Altri', pct: 4.2 },
    ],
    currencies: [{ code: 'USD', pct: 85 }, { code: 'CAD', pct: 5 }, { code: 'GBP', pct: 4 }, { code: 'Altri', pct: 6 }],
    sectors: [{ name: 'Beni di consumo', pct: 22.4 }, { name: 'Industria', pct: 18.6 }, { name: 'Finanza', pct: 12.8 }, { name: 'Sanità', pct: 12.2 }, { name: 'Materiali', pct: 10.4 }, { name: 'Altro', pct: 23.6 }],
    topHoldings: [
      { name: 'Procter & Gamble', pct: 3.2 }, { name: 'Coca-Cola', pct: 3.1 }, { name: 'Johnson & Johnson', pct: 2.9 },
      { name: 'Colgate-Palmolive', pct: 2.8 }, { name: 'Realty Income', pct: 2.6 }, { name: 'Federal Realty', pct: 2.4 },
    ],
  },

  msci_europe_value: {
    assetType: 'equity',
    numHoldings: 200,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 1.0, growth: -0.4, momentum: -0.2, quality: 0.1, size: -0.4, lowVol: 0.2, yield: 0.9 },
    geography: [
      { country: 'Regno Unito', pct: 22.8 }, { country: 'Francia', pct: 18.4 },
      { country: 'Germania', pct: 15.2 },    { country: 'Svizzera', pct: 12.6 },
      { country: 'Italia', pct: 8.4 },       { country: 'Spagna', pct: 6.2 },
      { country: 'Paesi Bassi', pct: 5.8 },  { country: 'Altri', pct: 10.6 },
    ],
    currencies: [{ code: 'EUR', pct: 62 }, { code: 'GBP', pct: 23 }, { code: 'CHF', pct: 13 }, { code: 'Altri', pct: 2 }],
    sectors: [{ name: 'Finanza', pct: 28.4 }, { name: 'Energia', pct: 14.2 }, { name: 'Materiali', pct: 12.6 }, { name: 'Industria', pct: 11.8 }, { name: 'Beni di consumo', pct: 10.2 }, { name: 'Altro', pct: 22.8 }],
  },

  high_yield_eur: {
    assetType: 'bond',
    numHoldings: 280,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 82 }, { name: 'Nord America', pct: 14 }, { name: 'Altro', pct: 4 }],
    geography: [
      { country: 'Francia', pct: 16.4 }, { country: 'Germania', pct: 12.8 }, { country: 'Lussemburgo', pct: 11.2 },
      { country: 'Regno Unito', pct: 10.6 }, { country: 'Italia', pct: 8.4 }, { country: 'Stati Uniti', pct: 7.8 },
      { country: 'Spagna', pct: 6.2 },   { country: 'Altri', pct: 26.6 },
    ],
    currencies: [{ code: 'EUR', pct: 88 }, { code: 'USD', pct: 8 }, { code: 'GBP', pct: 4 }],
    sectors: [{ name: 'Industria', pct: 28.4 }, { name: 'Finanza', pct: 22.6 }, { name: 'Comunicazione', pct: 16.4 }, { name: 'Consumi disc.', pct: 14.2 }, { name: 'Altro', pct: 18.4 }],
    bondInfo: { duration: 3.2, ytm: 5.8, creditRating: 'BB', type: 'High Yield EUR' },
  },

  usd_high_yield: {
    assetType: 'bond',
    numHoldings: 800,
    marketType: [{ type: 'Mercati sviluppati', pct: 85 }, { type: 'Mercati emergenti', pct: 15 }],
    area: [{ name: 'Nord America', pct: 82 }, { name: 'Europa', pct: 8 }, { name: 'Altro', pct: 10 }],
    geography: [{ country: 'Stati Uniti', pct: 80.4 }, { country: 'Canada', pct: 4.2 }, { country: 'Altri', pct: 15.4 }],
    currencies: [{ code: 'USD', pct: 100 }],
    bondInfo: { duration: 3.8, ytm: 7.2, creditRating: 'BB-', type: 'High Yield USD' },
  },

  short_duration_eur: {
    assetType: 'bond',
    numHoldings: 400,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 78 }, { name: 'Nord America', pct: 18 }, { name: 'Altro', pct: 4 }],
    currencies: [{ code: 'EUR', pct: 72 }, { code: 'USD', pct: 20 }, { code: 'GBP', pct: 8 }],
    bondInfo: { duration: 1.8, ytm: 3.4, creditRating: 'A', type: 'Obbligazioni EUR breve scadenza' },
  },

  msci_world_equal_weight: {
    assetType: 'equity',
    numHoldings: 1400,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 68 }, { name: 'Europa', pct: 18 }, { name: 'Giappone', pct: 6 }, { name: 'Asia Pacifico', pct: 5 }, { name: 'Altro', pct: 3 }],
    factors: { value: 0.4, growth: 0.0, momentum: -0.1, quality: 0.1, size: 0.8, lowVol: 0.2, yield: 0.2 },
    geography: [
      { country: 'Stati Uniti', pct: 65.8 }, { country: 'Giappone', pct: 5.8 }, { country: 'Regno Unito', pct: 4.2 },
      { country: 'Canada', pct: 3.8 },       { country: 'Francia', pct: 2.8 }, { country: 'Germania', pct: 2.6 },
      { country: 'Svizzera', pct: 2.4 },     { country: 'Australia', pct: 1.9 }, { country: 'Altri', pct: 10.7 },
    ],
    currencies: [{ code: 'USD', pct: 65 }, { code: 'EUR', pct: 14 }, { code: 'JPY', pct: 6 }, { code: 'GBP', pct: 4 }, { code: 'Altri', pct: 11 }],
    sectors: [{ name: 'Industria', pct: 14.2 }, { name: 'Tecnologia', pct: 13.8 }, { name: 'Finanza', pct: 13.4 }, { name: 'Sanità', pct: 12.6 }, { name: 'Consumi discrezionali', pct: 11.2 }, { name: 'Beni di consumo', pct: 9.8 }, { name: 'Altro', pct: 25.0 }],
  },

  // ── Profili virali — luglio 2026 (AI, Uranio, Space, Difesa EU…) ────────────

  artificial_intelligence: {
    assetType: 'equity',
    numHoldings: 85,
    marketType: [{ type: 'Mercati sviluppati', pct: 92 }, { type: 'Mercati emergenti', pct: 8 }],
    area: [{ name: 'Nord America', pct: 68 }, { name: 'Asia', pct: 18 }, { name: 'Europa', pct: 14 }],
    factors: { value: -0.6, growth: 1.2, momentum: 0.7, quality: 0.6, size: -0.6, lowVol: -0.6, yield: -0.5 },
    geography: [
      { country: 'Stati Uniti', pct: 65 }, { country: 'Taiwan',     pct: 8  },
      { country: 'Giappone',    pct: 5  }, { country: 'Cina',       pct: 5  },
      { country: 'Paesi Bassi', pct: 4  }, { country: 'Corea del Sud', pct: 3 },
      { country: 'Regno Unito', pct: 3  }, { country: 'Altri',      pct: 7  },
    ],
    currencies: [{ code: 'USD', pct: 68 }, { code: 'TWD', pct: 8 }, { code: 'EUR', pct: 9 }, { code: 'JPY', pct: 5 }, { code: 'Altri', pct: 10 }],
    sectors: [
      { name: 'Tecnologia (AI/ML)',    pct: 58 }, { name: 'Comunicazioni',     pct: 15 },
      { name: 'Sanità (AI health)',    pct: 12 }, { name: 'Industria (AI ops)', pct: 10 },
      { name: 'Finanza (AI fintech)',  pct: 5  },
    ],
    topHoldings: [
      { name: 'NVIDIA',        pct: 12.5 }, { name: 'Microsoft',      pct: 9.8  },
      { name: 'Alphabet',      pct: 6.5  }, { name: 'Meta Platforms',  pct: 5.8  },
      { name: 'Amazon',        pct: 5.2  }, { name: 'TSMC',            pct: 4.8  },
      { name: 'ARM Holdings',  pct: 4.2  }, { name: 'Palantir',        pct: 3.5  },
      { name: 'Baidu',         pct: 2.8  }, { name: 'ServiceNow',      pct: 2.5  },
    ],
  },

  uranium_nuclear: {
    assetType: 'equity',
    _commodityType: 'uranium',
    numHoldings: 35,
    marketType: [{ type: 'Mercati sviluppati', pct: 75 }, { type: 'Mercati emergenti', pct: 25 }],
    area: [{ name: 'Nord America', pct: 52 }, { name: 'Asia Centrale (Kaz)', pct: 25 }, { name: 'Australia', pct: 15 }, { name: 'Altro', pct: 8 }],
    factors: { value: 0.1, growth: 0.3, momentum: 0.9, quality: -0.1, size: -0.1, lowVol: -0.9, yield: 0.0 },
    geography: [
      { country: 'Canada',      pct: 40 }, { country: 'Kazakhstan', pct: 25 },
      { country: 'Australia',   pct: 15 }, { country: 'USA',         pct: 10 },
      { country: 'Altri',       pct: 10 },
    ],
    currencies: [{ code: 'CAD', pct: 40 }, { code: 'USD', pct: 30 }, { code: 'AUD', pct: 15 }, { code: 'KZT', pct: 10 }, { code: 'Altri', pct: 5 }],
    sectors: [{ name: 'Materiali (uranio)', pct: 80 }, { name: 'Utility (nucleare)', pct: 20 }],
    topHoldings: [
      { name: 'Cameco Corp',             pct: 22.0 }, { name: 'Kazatomprom',    pct: 16.5 },
      { name: 'NexGen Energy',           pct: 8.5  }, { name: 'Uranium Energy Corp', pct: 7.2 },
      { name: 'Denison Mines',           pct: 6.8  }, { name: 'Boss Energy',    pct: 5.5  },
      { name: 'Paladin Energy',          pct: 4.8  }, { name: 'Sprott Physical Uranium', pct: 4.5 },
      { name: 'enCore Energy',           pct: 3.2  }, { name: 'GoviEx Uranium', pct: 2.8  },
    ],
  },

  space_economy: {
    assetType: 'equity',
    numHoldings: 40,
    marketType: [{ type: 'Mercati sviluppati', pct: 95 }, { type: 'Mercati emergenti', pct: 5 }],
    area: [{ name: 'Nord America', pct: 72 }, { name: 'Europa', pct: 20 }, { name: 'Asia', pct: 8 }],
    factors: { value: -0.3, growth: 0.8, momentum: 0.5, quality: 0.2, size: -0.4, lowVol: -0.6, yield: -0.3 },
    geography: [
      { country: 'Stati Uniti', pct: 68 }, { country: 'Francia',  pct: 6  },
      { country: 'UK',          pct: 5  }, { country: 'Germania', pct: 5  },
      { country: 'Italia',      pct: 4  }, { country: 'Giappone', pct: 4  },
      { country: 'Altri',       pct: 8  },
    ],
    currencies: [{ code: 'USD', pct: 72 }, { code: 'EUR', pct: 18 }, { code: 'GBP', pct: 5 }, { code: 'Altri', pct: 5 }],
    sectors: [
      { name: 'Aerospazio (satelliti/razzi)', pct: 40 }, { name: 'Difesa spaziale',   pct: 25 },
      { name: 'Comunicazioni satellite',      pct: 20 }, { name: 'Tecnologia spaziale', pct: 15 },
    ],
    topHoldings: [
      { name: 'Lockheed Martin',  pct: 10.5 }, { name: 'Boeing',        pct: 8.8  },
      { name: 'Northrop Grumman', pct: 8.2  }, { name: 'Airbus',        pct: 7.5  },
      { name: 'Rocket Lab',       pct: 5.5  }, { name: 'Viasat',        pct: 4.8  },
      { name: 'Planet Labs',      pct: 4.2  }, { name: 'Thales Alenia',  pct: 4.0  },
      { name: 'OHB SE',           pct: 3.5  }, { name: 'AST SpaceMobile', pct: 3.2 },
    ],
  },

  european_defense: {
    assetType: 'equity',
    numHoldings: 30,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 0.1, growth: 0.5, momentum: 1.0, quality: 0.4, size: -0.5, lowVol: -0.3, yield: 0.2 },
    geography: [
      { country: 'Germania',     pct: 28 }, { country: 'Francia',    pct: 20 },
      { country: 'Regno Unito',  pct: 16 }, { country: 'Italia',     pct: 12 },
      { country: 'Svezia',       pct: 8  }, { country: 'Spagna',     pct: 6  },
      { country: 'Paesi Bassi',  pct: 5  }, { country: 'Altri EU',   pct: 5  },
    ],
    currencies: [{ code: 'EUR', pct: 72 }, { code: 'GBP', pct: 16 }, { code: 'SEK', pct: 8 }, { code: 'Altri', pct: 4 }],
    sectors: [{ name: 'Difesa & Aerospazio', pct: 90 }, { name: 'Tecnologia difesa', pct: 10 }],
    topHoldings: [
      { name: 'Rheinmetall',    pct: 18.5 }, { name: 'BAE Systems',  pct: 14.2 },
      { name: 'Thales',         pct: 12.0 }, { name: 'Leonardo',     pct: 10.5 },
      { name: 'Safran',         pct: 9.8  }, { name: 'Saab',         pct: 8.2  },
      { name: 'KNDS / Diehl',   pct: 5.5  }, { name: 'Indra',        pct: 4.8  },
      { name: 'Fincantieri',    pct: 4.0  }, { name: 'Kongsberg',    pct: 3.5  },
    ],
  },

  copper_miners: {
    assetType: 'equity',
    numHoldings: 28,
    marketType: [{ type: 'Mercati sviluppati', pct: 65 }, { type: 'Mercati emergenti', pct: 35 }],
    area: [{ name: 'Latam', pct: 40 }, { name: 'Nord America', pct: 28 }, { name: 'Australia', pct: 15 }, { name: 'Europa', pct: 10 }, { name: 'Africa', pct: 7 }],
    factors: { value: 0.3, growth: 0.1, momentum: 0.5, quality: 0.1, size: -0.4, lowVol: -0.5, yield: 0.2 },
    geography: [
      { country: 'Cile',         pct: 28 }, { country: 'USA',        pct: 18 },
      { country: 'Australia',    pct: 15 }, { country: 'Canada',     pct: 12 },
      { country: 'Perù',         pct: 10 }, { country: 'Congo (DRC)', pct: 8  },
      { country: 'Svizzera',     pct: 5  }, { country: 'Altri',      pct: 4  },
    ],
    currencies: [{ code: 'USD', pct: 55 }, { code: 'AUD', pct: 15 }, { code: 'CAD', pct: 12 }, { code: 'CLP', pct: 10 }, { code: 'Altri', pct: 8 }],
    sectors: [{ name: 'Materiali (rame)', pct: 88 }, { name: 'Materiali (multi-metallo)', pct: 12 }],
    topHoldings: [
      { name: 'Freeport-McMoRan', pct: 18.5 }, { name: 'Southern Copper', pct: 12.8 },
      { name: 'BHP Group',        pct: 11.5 }, { name: 'Glencore',        pct: 10.2 },
      { name: 'Rio Tinto',        pct: 9.5  }, { name: 'Antofagasta',     pct: 8.8  },
      { name: 'First Quantum',    pct: 7.2  }, { name: 'Lundin Mining',   pct: 5.5  },
      { name: 'Ivanhoe Mines',    pct: 5.0  }, { name: 'Teck Resources',  pct: 4.5  },
    ],
  },

  lithium_battery: {
    assetType: 'equity',
    numHoldings: 45,
    marketType: [{ type: 'Mercati sviluppati', pct: 60 }, { type: 'Mercati emergenti', pct: 40 }],
    area: [{ name: 'Nord America', pct: 30 }, { name: 'Asia', pct: 40 }, { name: 'Australia/Latam', pct: 20 }, { name: 'Europa', pct: 10 }],
    factors: { value: -0.1, growth: 0.7, momentum: -0.1, quality: 0.1, size: -0.3, lowVol: -0.7, yield: -0.2 },
    geography: [
      { country: 'Cina',        pct: 28 }, { country: 'USA',        pct: 22 },
      { country: 'Australia',   pct: 14 }, { country: 'Corea del Sud', pct: 10 },
      { country: 'Cile',        pct: 8  }, { country: 'Giappone',   pct: 7  },
      { country: 'Canada',      pct: 5  }, { country: 'Altri',      pct: 6  },
    ],
    currencies: [{ code: 'USD', pct: 38 }, { code: 'CNY', pct: 28 }, { code: 'AUD', pct: 14 }, { code: 'KRW', pct: 10 }, { code: 'Altri', pct: 10 }],
    sectors: [
      { name: 'Materiali (litio/cobalto)', pct: 38 }, { name: 'Industria (batterie)', pct: 32 },
      { name: 'Consumi (EV manufacturers)', pct: 18 }, { name: 'Tecnologia', pct: 12 },
    ],
    topHoldings: [
      { name: 'Albemarle',         pct: 12.5 }, { name: 'SQM',              pct: 10.8 },
      { name: 'BYD',               pct: 9.5  }, { name: 'CATL',             pct: 8.8  },
      { name: 'Samsung SDI',       pct: 7.5  }, { name: 'LG Energy Solution', pct: 6.8 },
      { name: 'Pilbara Minerals',  pct: 5.5  }, { name: 'Ganfeng Lithium',  pct: 5.0  },
      { name: 'Panasonic',         pct: 4.2  }, { name: 'Lithium Americas', pct: 3.8  },
    ],
  },

  biotech: {
    assetType: 'equity',
    numHoldings: 190,
    marketType: [{ type: 'Mercati sviluppati', pct: 95 }, { type: 'Mercati emergenti', pct: 5 }],
    area: [{ name: 'Nord America', pct: 62 }, { name: 'Europa', pct: 25 }, { name: 'Asia', pct: 10 }, { name: 'Altro', pct: 3 }],
    factors: { value: -0.4, growth: 0.9, momentum: 0.2, quality: 0.3, size: -0.1, lowVol: -0.5, yield: -0.4 },
    geography: [
      { country: 'Stati Uniti', pct: 58 }, { country: 'Svizzera',   pct: 8  },
      { country: 'Danimarca',   pct: 7  }, { country: 'Germania',   pct: 5  },
      { country: 'UK',          pct: 5  }, { country: 'Francia',    pct: 4  },
      { country: 'Giappone',    pct: 4  }, { country: 'Altri',      pct: 9  },
    ],
    currencies: [{ code: 'USD', pct: 62 }, { code: 'EUR', pct: 21 }, { code: 'DKK', pct: 7 }, { code: 'CHF', pct: 5 }, { code: 'Altri', pct: 5 }],
    sectors: [{ name: 'Biotecnologia', pct: 75 }, { name: 'Farmaceutico (specialistico)', pct: 25 }],
    topHoldings: [
      { name: 'AbbVie',          pct: 7.5 }, { name: 'Regeneron',        pct: 5.8 },
      { name: 'Vertex Pharma',   pct: 5.2 }, { name: 'Novo Nordisk',     pct: 4.8 },
      { name: 'BioNTech',        pct: 4.2 }, { name: 'Moderna',          pct: 3.8 },
      { name: 'Gilead Sciences', pct: 3.5 }, { name: 'Biogen',           pct: 3.2 },
      { name: 'Illumina',        pct: 2.8 }, { name: 'Alnylam Pharma',   pct: 2.5 },
    ],
  },

  solar_energy: {
    assetType: 'equity',
    numHoldings: 40,
    marketType: [{ type: 'Mercati sviluppati', pct: 65 }, { type: 'Mercati emergenti', pct: 35 }],
    area: [{ name: 'Nord America', pct: 38 }, { name: 'Asia (Cina)', pct: 35 }, { name: 'Europa', pct: 18 }, { name: 'Altro', pct: 9 }],
    factors: { value: -0.2, growth: 0.8, momentum: -0.1, quality: 0.0, size: -0.3, lowVol: -0.6, yield: -0.1 },
    geography: [
      { country: 'USA',         pct: 35 }, { country: 'Cina',      pct: 30 },
      { country: 'Germania',    pct: 7  }, { country: 'Danimarca',  pct: 6  },
      { country: 'Spagna',      pct: 5  }, { country: 'India',      pct: 4  },
      { country: 'Italia',      pct: 4  }, { country: 'Altri',      pct: 9  },
    ],
    currencies: [{ code: 'USD', pct: 38 }, { code: 'CNY', pct: 30 }, { code: 'EUR', pct: 22 }, { code: 'Altri', pct: 10 }],
    sectors: [
      { name: 'Energia solare (produzione)',   pct: 45 }, { name: 'Energia eolica',      pct: 20 },
      { name: 'Tecnologia energy storage',     pct: 18 }, { name: 'Utility (rinnovabili)', pct: 17 },
    ],
    topHoldings: [
      { name: 'First Solar',       pct: 10.5 }, { name: 'Enphase Energy',   pct: 9.8  },
      { name: 'SolarEdge',         pct: 8.5  }, { name: 'Vestas Wind',      pct: 7.2  },
      { name: 'Ørsted',            pct: 6.8  }, { name: 'SunPower',         pct: 5.5  },
      { name: 'JinkoSolar',        pct: 5.0  }, { name: 'Xinyi Solar',      pct: 4.5  },
      { name: 'LONGi Green Energy', pct: 4.0 }, { name: 'Iberdrola Renew.',  pct: 3.8  },
    ],
  },

  // ── Nuovi profili — espansione giugno 2026 ────────────────────────────────

  em_local_currency_bond: {
    assetType: 'bond',
    numHoldings: 200,
    marketType: [{ type: 'Mercati emergenti', pct: 100 }],
    area: [{ name: 'Asia', pct: 40 }, { name: 'Latam', pct: 28 }, { name: 'EMEA', pct: 32 }],
    geography: [
      { country: 'Cina',         pct: 18 }, { country: 'Brasile',     pct: 15 },
      { country: 'India',        pct: 10 }, { country: 'Messico',     pct: 9  },
      { country: 'Indonesia',    pct: 7  }, { country: 'Sud Africa',  pct: 7  },
      { country: 'Thailandia',   pct: 6  }, { country: 'Malaysia',    pct: 5  },
      { country: 'Polonia',      pct: 4  }, { country: 'Altri',       pct: 19 },
    ],
    currencies: [{ code: 'CNY', pct: 18 }, { code: 'BRL', pct: 15 }, { code: 'INR', pct: 10 }, { code: 'MXN', pct: 9 }, { code: 'Altri EM', pct: 48 }],
    bondInfo: { duration: 5.5, yieldToMaturity: 6.0, creditRating: 'BB+', averageMaturity: 8.2, couponRate: 5.8 },
  },

  gold_miners: {
    assetType: 'equity',
    numHoldings: 50,
    marketType: [{ type: 'Mercati sviluppati', pct: 80 }, { type: 'Mercati emergenti', pct: 20 }],
    area: [{ name: 'Nord America', pct: 62 }, { name: 'Australia', pct: 15 }, { name: 'Africa', pct: 12 }, { name: 'Latam', pct: 11 }],
    factors: { value: 0.2, growth: -0.1, momentum: 0.4, quality: -0.1, size: -0.3, lowVol: -0.4, yield: 0.2 },
    geography: [
      { country: 'Canada',       pct: 42 }, { country: 'Stati Uniti', pct: 20 },
      { country: 'Australia',    pct: 15 }, { country: 'Sud Africa',  pct: 10 },
      { country: 'Perù',         pct: 5  }, { country: 'Altri',       pct: 8  },
    ],
    currencies: [{ code: 'USD', pct: 65 }, { code: 'CAD', pct: 20 }, { code: 'AUD', pct: 10 }, { code: 'Altri', pct: 5 }],
    sectors: [{ name: 'Materiali (oro)', pct: 100 }],
    topHoldings: [
      { name: 'Newmont Mining',    pct: 12.5 }, { name: 'Barrick Gold',       pct: 10.8 },
      { name: 'Agnico Eagle',      pct: 8.2  }, { name: 'Wheaton Precious',   pct: 7.0  },
      { name: 'Franco-Nevada',     pct: 6.5  }, { name: 'Kinross Gold',       pct: 4.5  },
      { name: 'Gold Fields',       pct: 4.0  }, { name: 'AngloGold Ashanti',  pct: 3.8  },
      { name: 'Alamos Gold',       pct: 3.0  }, { name: 'B2Gold',             pct: 2.5  },
    ],
  },

  aerospace_defense: {
    assetType: 'equity',
    numHoldings: 55,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 62 }, { name: 'Europa', pct: 35 }, { name: 'Altro', pct: 3 }],
    factors: { value: 0.2, growth: 0.2, momentum: 0.5, quality: 0.5, size: -0.4, lowVol: 0.2, yield: 0.2 },
    geography: [
      { country: 'Stati Uniti', pct: 58 }, { country: 'Francia',    pct: 8  },
      { country: 'UK',          pct: 8  }, { country: 'Germania',   pct: 7  },
      { country: 'Italia',      pct: 6  }, { country: 'Canada',     pct: 4  },
      { country: 'Svezia',      pct: 3  }, { country: 'Altri',      pct: 6  },
    ],
    currencies: [{ code: 'USD', pct: 62 }, { code: 'EUR', pct: 25 }, { code: 'GBP', pct: 8 }, { code: 'Altri', pct: 5 }],
    sectors: [{ name: 'Industriale (A&D)', pct: 88 }, { name: 'Tecnologia', pct: 12 }],
    topHoldings: [
      { name: 'RTX Corporation',   pct: 11.5 }, { name: 'Lockheed Martin',    pct: 10.2 },
      { name: 'Northrop Grumman',  pct: 8.5  }, { name: 'General Dynamics',   pct: 7.8  },
      { name: 'Boeing',            pct: 7.0  }, { name: 'Airbus',             pct: 6.5  },
      { name: 'BAE Systems',       pct: 5.2  }, { name: 'Leonardo',           pct: 4.0  },
      { name: 'Safran',            pct: 3.8  }, { name: 'Thales',             pct: 3.0  },
    ],
  },

  megatrends_global: {
    assetType: 'equity',
    numHoldings: 125,
    marketType: [{ type: 'Mercati sviluppati', pct: 88 }, { type: 'Mercati emergenti', pct: 12 }],
    area: [{ name: 'Nord America', pct: 58 }, { name: 'Europa', pct: 18 }, { name: 'Asia', pct: 18 }, { name: 'Altro', pct: 6 }],
    factors: { value: -0.3, growth: 0.7, momentum: 0.4, quality: 0.5, size: -0.6, lowVol: -0.2, yield: -0.2 },
    geography: [
      { country: 'Stati Uniti', pct: 55 }, { country: 'Germania',  pct: 5  },
      { country: 'Svizzera',    pct: 4  }, { country: 'Giappone',  pct: 5  },
      { country: 'Taiwan',      pct: 4  }, { country: 'Cina',      pct: 4  },
      { country: 'Francia',     pct: 3  }, { country: 'Altri',     pct: 20 },
    ],
    currencies: [{ code: 'USD', pct: 58 }, { code: 'EUR', pct: 14 }, { code: 'JPY', pct: 5 }, { code: 'TWD', pct: 4 }, { code: 'Altri', pct: 19 }],
    sectors: [
      { name: 'Tecnologia',            pct: 33 }, { name: 'Sanità',              pct: 18 },
      { name: 'Industria',             pct: 18 }, { name: 'Consumi discrezionali', pct: 13 },
      { name: 'Comunicazioni',         pct: 10 }, { name: 'Altro',               pct: 8  },
    ],
    topHoldings: [
      { name: 'NVIDIA',       pct: 5.5 }, { name: 'Microsoft',    pct: 4.8 },
      { name: 'Alphabet',     pct: 3.2 }, { name: 'ASML',         pct: 3.0 },
      { name: 'Novo Nordisk', pct: 2.8 }, { name: 'Intuitive Surgical', pct: 2.5 },
      { name: 'Tesla',        pct: 2.2 }, { name: 'Samsung',      pct: 2.0 },
      { name: 'TSMC',         pct: 1.9 }, { name: 'Schneider El.', pct: 1.8 },
    ],
  },

  msci_europe_sc: {
    assetType: 'equity',
    numHoldings: 950,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    factors: { value: 0.4, growth: 0.2, momentum: 0.1, quality: 0.2, size: 0.9, lowVol: -0.1, yield: 0.3 },
    geography: [
      { country: 'Regno Unito', pct: 20 }, { country: 'Germania',  pct: 16 },
      { country: 'Francia',     pct: 12 }, { country: 'Svezia',    pct: 10 },
      { country: 'Svizzera',    pct: 7  }, { country: 'Paesi Bassi', pct: 6 },
      { country: 'Italia',      pct: 6  }, { country: 'Spagna',    pct: 5  },
      { country: 'Altri',       pct: 18 },
    ],
    currencies: [{ code: 'GBP', pct: 20 }, { code: 'EUR', pct: 58 }, { code: 'SEK', pct: 10 }, { code: 'CHF', pct: 7 }, { code: 'Altri', pct: 5 }],
    sectors: [
      { name: 'Industria',              pct: 22 }, { name: 'Consumi discrezionali', pct: 15 },
      { name: 'Sanità',                 pct: 13 }, { name: 'Finanza',               pct: 12 },
      { name: 'Tecnologia',             pct: 10 }, { name: 'Materiali',             pct: 9  },
      { name: 'Beni di consumo',        pct: 7  }, { name: 'Altro',                 pct: 12 },
    ],
  },

  global_infrastructure: {
    assetType: 'equity',
    numHoldings: 75,
    marketType: [{ type: 'Mercati sviluppati', pct: 92 }, { type: 'Mercati emergenti', pct: 8 }],
    area: [{ name: 'Nord America', pct: 40 }, { name: 'Europa', pct: 35 }, { name: 'Asia Pacifico', pct: 18 }, { name: 'Altro', pct: 7 }],
    factors: { value: 0.4, growth: 0.0, momentum: 0.1, quality: 0.3, size: -0.6, lowVol: 0.6, yield: 0.7 },
    geography: [
      { country: 'Stati Uniti', pct: 36 }, { country: 'Spagna',    pct: 10 },
      { country: 'UK',          pct: 9  }, { country: 'Australia', pct: 8  },
      { country: 'Italia',      pct: 7  }, { country: 'Canada',    pct: 6  },
      { country: 'Francia',     pct: 6  }, { country: 'Cina',      pct: 5  },
      { country: 'Giappone',    pct: 4  }, { country: 'Altri',     pct: 9  },
    ],
    currencies: [{ code: 'USD', pct: 42 }, { code: 'EUR', pct: 28 }, { code: 'GBP', pct: 9 }, { code: 'AUD', pct: 8 }, { code: 'Altri', pct: 13 }],
    sectors: [
      { name: 'Utility (infrastrutture)',    pct: 36 }, { name: 'Industriale (trasporti)', pct: 30 },
      { name: 'Energia (pipeline/reti)',     pct: 20 }, { name: 'Comunicazioni (torri)',   pct: 14 },
    ],
    topHoldings: [
      { name: 'Vinci',                 pct: 5.0 }, { name: 'Enbridge',       pct: 4.8 },
      { name: 'National Grid',         pct: 4.5 }, { name: 'TransCanada',    pct: 4.2 },
      { name: 'Atlantia/Mundys',       pct: 3.8 }, { name: 'Terna',          pct: 3.5 },
      { name: 'Snam',                  pct: 3.2 }, { name: 'Ferrovial',      pct: 3.0 },
      { name: 'Aeroports de Paris',    pct: 2.8 }, { name: 'Flughafen Zurich', pct: 2.5 },
    ],
  },

  msci_em_asia: {
    assetType: 'equity',
    numHoldings: 650,
    marketType: [{ type: 'Mercati emergenti', pct: 95 }, { type: 'Mercati di frontiera', pct: 5 }],
    area: [{ name: 'Asia emergente', pct: 100 }],
    factors: { value: 0.1, growth: 0.4, momentum: 0.0, quality: 0.2, size: -0.3, lowVol: -0.1, yield: 0.2 },
    geography: [
      { country: 'Cina',         pct: 38 }, { country: 'Taiwan',      pct: 18 },
      { country: 'Corea del Sud', pct: 15 }, { country: 'India',      pct: 12 },
      { country: 'Thailandia',   pct: 5  }, { country: 'Malaysia',    pct: 4  },
      { country: 'Indonesia',    pct: 4  }, { country: 'Filippine',   pct: 2  },
      { country: 'Altri',        pct: 2  },
    ],
    currencies: [{ code: 'CNY/HKD', pct: 38 }, { code: 'TWD', pct: 18 }, { code: 'KRW', pct: 15 }, { code: 'INR', pct: 12 }, { code: 'Altri', pct: 17 }],
    sectors: [
      { name: 'Tecnologia',            pct: 32 }, { name: 'Consumi discrezionali', pct: 14 },
      { name: 'Finanza',               pct: 14 }, { name: 'Comunicazioni',         pct: 11 },
      { name: 'Industria',             pct: 7  }, { name: 'Materiali',             pct: 6  },
      { name: 'Sanità',                pct: 5  }, { name: 'Altro',                 pct: 11 },
    ],
  },

  us_short_treasury: {
    assetType: 'bond',
    numHoldings: 45,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 100 }],
    geography: [{ country: 'Stati Uniti', pct: 100 }],
    currencies: [{ code: 'USD', pct: 100 }],
    bondInfo: { duration: 1.8, yieldToMaturity: 4.7, creditRating: 'AAA', averageMaturity: 2.1, couponRate: 3.9 },
  },

  msci_world_tech: {
    assetType: 'equity',
    numHoldings: 220,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 74 }, { name: 'Europa', pct: 11 }, { name: 'Asia Pacifico', pct: 15 }],
    factors: { value: -0.5, growth: 0.9, momentum: 0.4, quality: 0.7, size: -0.5, lowVol: -0.3, yield: -0.3 },
    geography: [
      { country: 'Stati Uniti', pct: 72 }, { country: 'Giappone',   pct: 5  },
      { country: 'Paesi Bassi', pct: 4  }, { country: 'Taiwan',     pct: 4  },
      { country: 'Corea del Sud', pct: 3 }, { country: 'Germania',  pct: 3  },
      { country: 'Francia',     pct: 2  }, { country: 'Altri',      pct: 7  },
    ],
    currencies: [{ code: 'USD', pct: 74 }, { code: 'EUR', pct: 10 }, { code: 'JPY', pct: 5 }, { code: 'TWD', pct: 4 }, { code: 'Altri', pct: 7 }],
    sectors: [{ name: 'Tecnologia', pct: 100 }],
    topHoldings: [
      { name: 'Apple',      pct: 16.5 }, { name: 'NVIDIA',     pct: 14.2 },
      { name: 'Microsoft',  pct: 13.8 }, { name: 'TSMC',       pct: 5.0  },
      { name: 'Broadcom',   pct: 4.8  }, { name: 'ASML',       pct: 3.8  },
      { name: 'Samsung',    pct: 3.5  }, { name: 'SAP',        pct: 2.5  },
      { name: 'Infosys',    pct: 1.8  }, { name: 'KDDI',       pct: 1.5  },
    ],
  },

  climate_transition: {
    assetType: 'equity',
    numHoldings: 750,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Nord America', pct: 66 }, { name: 'Europa', pct: 19 }, { name: 'Giappone', pct: 7 }, { name: 'Asia Pacifico', pct: 5 }, { name: 'Altro', pct: 3 }],
    factors: { value: -0.1, growth: 0.3, momentum: 0.2, quality: 0.5, size: -0.4, lowVol: 0.1, yield: 0.0 },
    geography: [
      { country: 'Stati Uniti', pct: 63 }, { country: 'Giappone',  pct: 7  },
      { country: 'Regno Unito', pct: 4  }, { country: 'Francia',   pct: 3  },
      { country: 'Germania',    pct: 3  }, { country: 'Canada',    pct: 3  },
      { country: 'Svizzera',    pct: 2  }, { country: 'Altri',     pct: 15 },
    ],
    currencies: [{ code: 'USD', pct: 66 }, { code: 'EUR', pct: 15 }, { code: 'JPY', pct: 7 }, { code: 'GBP', pct: 4 }, { code: 'Altri', pct: 8 }],
    sectors: [
      { name: 'Tecnologia',       pct: 26 }, { name: 'Sanità',       pct: 14 },
      { name: 'Industria',        pct: 13 }, { name: 'Finanza',      pct: 13 },
      { name: 'Consumi discrez.', pct: 11 }, { name: 'Utility',      pct: 8  },
      { name: 'Beni di consumo',  pct: 7  }, { name: 'Altro',        pct: 8  },
    ],
    topHoldings: [
      { name: 'Microsoft',  pct: 5.8 }, { name: 'Apple',       pct: 5.2 },
      { name: 'NVIDIA',     pct: 4.8 }, { name: 'Alphabet',    pct: 3.2 },
      { name: 'Amazon',     pct: 2.8 }, { name: 'Broadcom',    pct: 2.2 },
      { name: 'Tesla',      pct: 2.0 }, { name: 'Eli Lilly',   pct: 1.9 },
      { name: 'Visa',       pct: 1.7 }, { name: 'Mastercard',  pct: 1.5 },
    ],
  },

  eur_short_gov: {
    assetType: 'bond',
    numHoldings: 80,
    marketType: [{ type: 'Mercati sviluppati', pct: 100 }],
    area: [{ name: 'Europa', pct: 100 }],
    geography: [
      { country: 'Germania',    pct: 28 }, { country: 'Francia',  pct: 22 },
      { country: 'Italia',      pct: 16 }, { country: 'Spagna',   pct: 12 },
      { country: 'Olanda',      pct: 8  }, { country: 'Belgio',   pct: 6  },
      { country: 'Austria',     pct: 4  }, { country: 'Altri',    pct: 4  },
    ],
    currencies: [{ code: 'EUR', pct: 100 }],
    bondInfo: { duration: 1.5, yieldToMaturity: 2.8, creditRating: 'A+', averageMaturity: 1.8, couponRate: 1.9 },
  },
};

// ── Mappa ticker → profilo ───────────────────────────────────────────────────

const TICKER_PROFILE = {
  // MSCI World
  'SWDA.MI': 'msci_world', 'SWDA.L': 'msci_world', 'IWDA.AS': 'msci_world',
  'MEUD.MI': 'msci_world', 'LCWD.MI': 'msci_world', 'HMWO.L': 'msci_world',
  'XTEC.DE': 'msci_world', 'XHCA.DE': 'msci_world', 'XENR.DE': 'msci_world',
  'XFIN.DE': 'msci_world', 'IWMO.L': 'msci_world', 'IWQU.L': 'msci_world',
  'IWVL.L': 'msci_world_value', 'SUWS.MI': 'msci_world_esg', 'SUSW.MI': 'msci_world_esg',
  'LCWL.MI': 'msci_world',

  // FTSE All-World / ACWI
  'VWCE.DE': 'ftse_all_world', 'VWCE.MI': 'ftse_all_world',
  'VWRL.AS': 'ftse_all_world', 'VWRA.L': 'ftse_all_world',
  'FWRA.MI': 'ftse_all_world', 'IUSQ.DE': 'ftse_all_world',

  // MSCI ACWI (include emerging — iShares, Amundi)
  'ACWI.MI': 'msci_acwi', 'ACWI': 'msci_acwi', 'SSAC.L': 'msci_acwi',
  'ISAC.MI': 'msci_acwi', 'ACWI.L': 'msci_acwi',

  // S&P 500
  'CSPX.L': 'sp500', 'SXR8.DE': 'sp500', 'VUAA.MI': 'sp500',
  'CSX5.DE': 'sp500', 'SPXS.MI': 'sp500', 'LSPU.MI': 'sp500',
  'VUSA.MI': 'sp500', 'CSP1.MI': 'sp500', 'QDVE.DE': 'sp500',
  'HEAL.MI': 'sp500', 'NRGG.MI': 'sp500', 'A500.MI': 'sp500',

  // NASDAQ-100
  'EQQQ.MI': 'nasdaq100', 'CNDX.MI': 'nasdaq100', 'LQQ.PA': 'nasdaq100',
  'QQQM':    'nasdaq100',

  // MSCI Europe / Euro Stoxx
  'SMEA.MI': 'msci_europe', 'VEUR.MI': 'msci_europe', 'LYYS.DE': 'msci_europe',
  'SXRJ.DE': 'euro_stoxx50', 'EXW1.DE': 'euro_stoxx50',

  // Emerging Markets
  'IS3N.DE': 'msci_em', 'EMIM.MI': 'msci_em', 'VFEM.MI': 'msci_em',
  'SEMA.MI': 'msci_em', 'AEEM.MI': 'msci_em', 'EIMI.L': 'msci_em',
  'EIMI.MI': 'msci_em', 'IEEM.MI': 'msci_em', 'IEEM.L': 'msci_em',
  'LEME.MI': 'msci_em_ex_china',

  // EM ex China
  'EMXC.MI': 'msci_em_ex_china', 'EMXC': 'msci_em_ex_china', 'EXCS.L': 'msci_em_ex_china',

  // China
  'LCCN.MI': 'msci_china', 'MCSI.MI': 'msci_china', 'CHNA.L': 'msci_china',
  'FXC.L': 'msci_china', 'FLXC.MI': 'msci_china',

  // Japan
  'IJPA.L': 'msci_japan', 'VJPN.MI': 'msci_japan',

  // Pacific ex-Japan
  'IASP.L': 'msci_pacific_exjp',

  // Small Cap
  'IUSN.DE': 'msci_world_sc', 'WSML.MI': 'msci_world_sc',

  // Global Aggregate Bond
  'AGGH.MI': 'global_agg_bond', 'VAGF.MI': 'global_agg_bond', 'XBAG.DE': 'global_agg_bond',

  // Euro Government Bond
  'IGLT.L': 'euro_gov_bond', 'IBTS.MI': 'euro_gov_bond',
  'CSBGE0.DE': 'euro_gov_bond', 'VETY.MI': 'euro_gov_bond',
  'ETLB.MI': 'euro_gov_bond', 'IBCI.MI': 'euro_gov_bond', 'IEGE.MI': 'euro_gov_bond',

  // Euro Corporate Bond
  'EUNA.DE': 'euro_corp_bond', 'VCBO.MI': 'euro_corp_bond',
  'IEAA.L': 'euro_corp_bond', 'IHYG.MI': 'euro_corp_bond', 'HYLD.DE': 'euro_corp_bond',
  'VECA.MI': 'vanguard_eur_corp', 'VECP.MI': 'vanguard_eur_corp', 'VEUR.AS': 'vanguard_eur_corp',

  // USD Treasury
  'IDTL.L': 'usd_treasury_long', 'DTLA.L': 'usd_treasury',
  'IBTM.L': 'usd_treasury', 'IBTU.L': 'usd_treasury', 'VDTY.L': 'usd_treasury',
  'TIPS.L': 'usd_treasury', 'CSBGU7.MI': 'usd_treasury',

  // EUR Inflation-Linked
  'EMI.MI': 'eur_infl_linked', 'GISG.MI': 'eur_infl_linked',
  'INFL.MI': 'eur_infl_linked', 'GISG.L': 'eur_infl_linked',

  // USD Corporate
  'LQDA.L': 'usd_corp_bond', 'VUCP.MI': 'usd_corp_bond', 'LQDE.L': 'usd_corp_bond',

  // EM Bond
  'SEML.MI': 'em_bond_hard', 'VDEM.L': 'em_bond_hard',

  // Ultra-Short / Overnight
  'IBGS.L': 'ultra_short_eur',
  'XEON.DE': 'overnight_eur', 'CSH2.PA': 'overnight_eur',

  // Real Estate
  'IWDP.MI': 'epra_nareit_dev', 'EPRA.MI': 'epra_nareit_dev',

  // Gold / Commodity
  'PPFB.MI': 'physical_gold', 'SGLD.MI': 'physical_gold', 'PHAU.MI': 'physical_gold',
  'SGLN.MI': 'physical_gold', 'IGLN.MI': 'physical_gold', 'IGLN.L': 'physical_gold',
  'CMOD.MI': 'bloomberg_commodity', 'AIGI.MI': 'bloomberg_commodity',
  'GLD':     'physical_gold', 'IAU': 'physical_gold',

  // Dividendi
  'VHYL.MI': 'dividend_global', 'GGRP.DE': 'dividend_global',
  'VGWE.MI': 'dividend_global', 'VGWE.DE': 'dividend_global', 'VGWE': 'dividend_global', // Vanguard All-World High Div (Acc)
  'VHYG.MI': 'dividend_global',
  'IDVY.MI': 'dividend_europe',

  // Crypto
  'BTCE.DE': 'bitcoin_spot', 'VBTC.L': 'bitcoin_spot',
  'BTC-USD': 'bitcoin_spot', 'ETH-USD': 'ethereum_spot',
  'BNB-USD': 'bitcoin_spot', 'SOL-USD': 'bitcoin_spot',
  'XRP-USD': 'bitcoin_spot', 'ADA-USD': 'bitcoin_spot',

  // LifeStrategy
  'V20A.DE': 'lifestrategy_20', 'V40A.DE': 'lifestrategy_20',
  'V60A.DE': 'lifestrategy_80', 'V80A.DE': 'lifestrategy_80',

  // ── Factor ETFs ───────────────────────────────────────────────────────────

  // MSCI World Momentum
  'XDEM.MI': 'msci_world_momentum', 'XDEM.DE': 'msci_world_momentum',
  'IWMO.MI': 'msci_world_momentum', 'IS3M.DE': 'msci_world_momentum',
  'IMOM.L':  'msci_world_momentum',

  // MSCI World Quality
  'XDEQ.MI': 'msci_world_quality', 'XDEQ.DE': 'msci_world_quality',
  'IWQU.MI': 'msci_world_quality', 'IQSA.L':  'msci_world_quality',

  // MSCI World Value
  'IWVL.MI': 'msci_world_value', 'IUVL.MI': 'msci_world_value', 'MVLU.MI': 'msci_world_value',
  'XDEV.MI': 'msci_world_value', 'XDEV.DE': 'msci_world_value',

  // MSCI USA Small Cap Value
  'ZPRV.MI': 'msci_usa_sc_value', 'ZPRV.DE': 'msci_usa_sc_value',
  'ISUS.MI': 'msci_usa_sc_value',

  // MSCI Europe Small Cap Value
  'ZPRX.MI': 'msci_europe_sc_value', 'ZPRX.DE': 'msci_europe_sc_value',
  'ISEV.MI': 'msci_europe_sc_value',

  // S&P 500 High Dividend
  'SPYD.MI': 'sp500_high_div', 'SPYD.DE': 'sp500_high_div',
  'HDIV.MI': 'sp500_high_div', 'IDVY.DE': 'sp500_high_div',

  // Europe ETFs (vari provider)
  'EUNY.MI': 'msci_europe', 'EUNU.MI': 'msci_europe',
  'SPEURO.MI': 'msci_europe', 'IEUR.MI': 'msci_europe',

  // ── Singole azioni — Technology ────────────────────────────────────────────
  'MSFT':    'us_stock_tech', 'MSFT.O': 'us_stock_tech',
  'AAPL':    'us_stock_tech', 'AAPL.O': 'us_stock_tech',
  'NVDA':    'us_stock_tech', 'NVDA.O': 'us_stock_tech',
  'GOOGL':   'us_stock_comm', 'GOOG':   'us_stock_comm',
  'META':    'us_stock_comm',
  'AMZN':    'us_stock_consumer_disc',
  'TSLA':    'us_stock_consumer_disc',
  'AMD':     'us_stock_tech',
  'INTC':    'us_stock_tech',
  'ORCL':    'us_stock_tech',
  'CRM':     'us_stock_tech',
  'ADBE':    'us_stock_tech',
  'CSCO':    'us_stock_tech',

  // ── Singole azioni — Finance ──────────────────────────────────────────────
  'AXP':     'us_stock_finance', 'AXP.N': 'us_stock_finance',
  'V':       'us_stock_finance', 'V.N':   'us_stock_finance',
  'MA':      'us_stock_finance',
  'JPM':     'us_stock_finance',
  'BAC':     'us_stock_finance',
  'BRK.B':   'us_stock_finance',
  'GS':      'us_stock_finance',
  'MS':      'us_stock_finance',
  'BLK':     'us_stock_finance',
  'SCHW':    'us_stock_finance',

  // ── Singole azioni — Healthcare ────────────────────────────────────────────
  'ABBV':    'us_stock_health', 'ABBV.N': 'us_stock_health',
  'JNJ':     'us_stock_health',
  'LLY':     'us_stock_health',
  'UNH':     'us_stock_health',
  'MRK':     'us_stock_health',
  'PFE':     'us_stock_health',
  'TMO':     'us_stock_health',
  'ABT':     'us_stock_health',
  'MDT':     'us_stock_health',

  // ── Singole azioni — Consumer Discretionary ────────────────────────────────
  'NKE':     'us_stock_consumer_disc', 'NKE.N': 'us_stock_consumer_disc',
  'HD':      'us_stock_consumer_disc',
  'MCD':     'us_stock_consumer_disc',
  'SBUX':    'us_stock_consumer_disc',
  'TGT':     'us_stock_consumer_disc',
  'LOW':     'us_stock_consumer_disc',

  // ── Singole azioni — Consumer Staples ──────────────────────────────────────
  'PG':      'us_stock_consumer_staples',
  'KO':      'us_stock_consumer_staples',
  'PEP':     'us_stock_consumer_staples',
  'WMT':     'us_stock_consumer_staples',
  'COST':    'us_stock_consumer_staples',
  'PM':      'us_stock_consumer_staples',
  'MO':      'us_stock_consumer_staples',

  // ── Singole azioni — Energy ────────────────────────────────────────────────
  'XOM':     'us_stock_energy',
  'CVX':     'us_stock_energy',
  'COP':     'us_stock_energy',

  // ── Singole azioni — Industrials ──────────────────────────────────────────
  'CAT':     'us_stock_industrial',
  'GE':      'us_stock_industrial',
  'HON':     'us_stock_industrial',
  'UPS':     'us_stock_industrial',
  'RTX':     'us_stock_industrial',

  // ── Singole azioni — Real Estate ──────────────────────────────────────────
  'O':       'us_stock_reit', 'O.N':    'us_stock_reit',
  'AMT':     'us_stock_reit',
  'PLD':     'us_stock_reit',
  'SPG':     'us_stock_reit',

  // ── Singole azioni — Communication ────────────────────────────────────────
  'DIS':     'us_stock_comm',
  'NFLX':    'us_stock_comm',
  'T':       'us_stock_comm',
  'VZ':      'us_stock_comm',

  // ── BDC — Business Development Companies ─────────────────────────────────
  'ARCC':    'us_stock_bdc', 'ARCC.O': 'us_stock_bdc',
  'MAIN':    'us_stock_bdc', 'MAIN.N': 'us_stock_bdc',
  'BXSL':    'us_stock_bdc',
  'FSK':     'us_stock_bdc',
  'GBDC':    'us_stock_bdc',
  'OBDC':    'us_stock_bdc',

  // ── Carnival Corp NYSE (diverso da CCL.L Londra) ──────────────────────────
  'CCL':     'us_stock_consumer_disc', 'CCL.N': 'us_stock_consumer_disc',

  // ── Singole azioni — London (GBP) ─────────────────────────────────────────
  'CCL.L':   'uk_stock_consumer_disc',
  'BP.L':    'uk_stock_energy_gbp',
  'SHEL.L':  'uk_stock_energy_gbp',
  'HSBA.L':  'uk_stock_finance_gbp',
  'LLOY.L':  'uk_stock_finance_gbp',
  'BARC.L':  'uk_stock_finance_gbp',
  'AZN.L':   'uk_stock_health_gbp',
  'GSK.L':   'uk_stock_health_gbp',
  'RIO.L':   'uk_stock_materials_gbp',
  'AAL.L':   'uk_stock_materials_gbp',
  'VOD.L':   'uk_stock_comm_gbp',
  'BT.A.L':  'uk_stock_comm_gbp',

  // ── Nuovi ETF tematici — giugno 2026 ──────────────────────────────────────

  // Healthcare globale
  'HEAL.L': 'global_healthcare', 'IXJ': 'global_healthcare',
  'DHCA.MI': 'global_healthcare', 'XLVH.MI': 'global_healthcare',
  'WHEA.MI': 'global_healthcare',

  // Cybersecurity
  'HACK.MI': 'cybersecurity', 'WCBR.MI': 'cybersecurity',
  'ISPY.MI': 'cybersecurity', 'CIBR': 'cybersecurity',
  'BUG.MI': 'cybersecurity',

  // Water
  'IQQQ.MI': 'water_global', 'WATER.MI': 'water_global',
  'FIW': 'water_global', 'CGW': 'water_global',
  'WATL': 'water_global', 'WATL.L': 'water_global', 'WATL.MI': 'water_global', // Amundi MSCI Water

  // Semiconductors
  'SEMI.MI': 'semiconductors', 'SEMI.L': 'semiconductors',
  'SOXX': 'semiconductors', 'SMH': 'semiconductors',
  'SMH.MI': 'semiconductors', 'SMH.L': 'semiconductors', 'VVSM.DE': 'semiconductors',
  'CHIPS.MI': 'semiconductors', 'XCHP.MI': 'semiconductors',
  '5MVS.MI': 'semiconductors',

  // Copper Miners / materie prime azionarie
  '4COP': 'copper_miners', '4COP.DE': 'copper_miners', '4COP.L': 'copper_miners',
  'COPX': 'copper_miners', 'COPG.L': 'copper_miners',

  // Dividend Aristocrats
  'NOBL.MI': 'dividend_aristocrats', 'UDVD.MI': 'dividend_aristocrats',
  'SPRD.MI': 'dividend_aristocrats', 'WQDV.MI': 'dividend_aristocrats',

  // MSCI Europe Value
  'EVAL.MI': 'msci_europe_value', 'IEEV.MI': 'msci_europe_value',
  'EFV': 'msci_europe_value',

  // High Yield EUR
  'IHYG.L': 'high_yield_eur', 'HYG.MI': 'high_yield_eur',
  'XHYG.MI': 'high_yield_eur', 'EHYA.MI': 'high_yield_eur',
  'FLHD.MI': 'high_yield_eur',

  // USD High Yield
  'HYG': 'usd_high_yield', 'JNK': 'usd_high_yield',
  'USHY.MI': 'usd_high_yield', 'SHYG.MI': 'usd_high_yield',

  // Short Duration EUR
  'IBCX.MI': 'short_duration_eur', 'CRPE.MI': 'short_duration_eur',
  'EUSC.MI': 'short_duration_eur',

  // MSCI World Equal Weight
  'EWLD.MI': 'msci_world_equal_weight', 'MWED.MI': 'msci_world_equal_weight',

  // ── Nuovi ETF — espansione maggio 2026 ────────────────────────────────────

  // STOXX Europe 600
  'EXSA.MI': 'stoxx_europe_600', 'EXSA.DE': 'stoxx_europe_600',
  'XSSX.MI': 'stoxx_europe_600', 'XSSX.DE': 'stoxx_europe_600',
  'STOXX.MI': 'stoxx_europe_600', 'SPEU.MI': 'stoxx_europe_600',
  'SSTY.MI': 'stoxx_europe_600',

  // MSCI World Minimum Volatility
  'MVOL.MI': 'msci_world_min_vol', 'MVOL.L': 'msci_world_min_vol',
  'IS3S.DE': 'msci_world_min_vol', 'UIMV.MI': 'msci_world_min_vol',
  'MVIE.MI': 'msci_world_min_vol', 'IEML.MI': 'msci_world_min_vol',

  // MSCI World ESG / SRI
  'ESGE.MI': 'msci_world_esg', 'MSRW.MI': 'msci_world_esg',
  'PABM.MI': 'msci_world_esg', 'XZWD.DE': 'msci_world_esg',
  'SUWO.MI': 'msci_world_esg', 'PABW.MI': 'msci_world_esg',
  'IQSW.MI': 'msci_world_esg', 'MXWS.MI': 'msci_world_esg',

  // MSCI India
  'NDIA.MI': 'msci_india', 'NDIA.L': 'msci_india',
  'XINA.MI': 'msci_india', 'IIND.L': 'msci_india',
  'IN9.DE':  'msci_india', 'FLXI.MI': 'msci_india',
  'WINDM.MI': 'msci_india', 'MIND.L': 'msci_india',

  // Clean Energy
  'INRG.MI': 'clean_energy', 'INRG.L': 'clean_energy',
  'IQQH.DE': 'clean_energy', 'DBLE.MI': 'clean_energy',
  '2B76.MI': 'clean_energy', 'CLNE.MI': 'clean_energy',
  'RENG.MI': 'clean_energy', 'GCLM.MI': 'clean_energy',

  // Automation, Robotics & AI
  'RBOT.MI': 'automation_robotics', 'RBOT.L': 'automation_robotics',
  'XAIX.MI': 'automation_robotics', 'WTAI.MI': 'automation_robotics',
  'IRBO.MI': 'automation_robotics', '2B77.DE': 'automation_robotics',
  'ROBO.MI': 'automation_robotics', 'AIAI.MI': 'automation_robotics',

  // Silver
  'PHSP.MI': 'silver_spot', 'PHSP.L': 'silver_spot',
  'PHAG.L':  'silver_spot', 'SLV':    'silver_spot',
  'SLVE.MI': 'silver_spot', 'VZLD.MI': 'silver_spot',
  'ISLN.MI': 'silver_spot',

  // FTSE MIB (Italia)
  'IMIB.MI': 'ftse_mib', 'XMIB.MI': 'ftse_mib',
  'CEME.MI': 'ftse_mib', 'FMIB.MI': 'ftse_mib',
  'LYXIB.MI': 'ftse_mib',

  // EM Latin America
  'LTAM.MI': 'em_latin_america', 'LTAM.L': 'em_latin_america',
  'FLXB.MI': 'em_latin_america', 'LATM.L': 'em_latin_america',

  // BTP / Italy Government Bond
  'BTPI.MI': 'btp_italy', 'IBTP.MI': 'btp_italy',
  'XBTP.MI': 'btp_italy', 'ITAB.MI': 'btp_italy',
  'EBTP.MI': 'btp_italy',

  // MSCI World Multifactor
  'JPGL.MI': 'msci_world_multifactor', 'JPGL.L': 'msci_world_multifactor',
  'MULB.MI': 'msci_world_multifactor', 'IFSW.MI': 'msci_world_multifactor',
  'WDMF.MI': 'msci_world_multifactor',

  // ── Nuovi ETF virali — luglio 2026 (AI, Uranio, Space, Difesa EU…) ─────────

  // Artificial Intelligence (pure-play AI/ML)
  'WTAI.MI':  'artificial_intelligence', 'WTAI.L':   'artificial_intelligence',
  'AIAI.MI':  'artificial_intelligence', 'AIAI.L':   'artificial_intelligence',
  'XAIX.MI':  'artificial_intelligence', 'XAIX.DE':  'artificial_intelligence',
  'BOTZ':     'artificial_intelligence', 'AIQ':      'artificial_intelligence',
  'CHAT':     'artificial_intelligence', 'GFAI.MI':  'artificial_intelligence',

  // Uranium & Nuclear
  'URA':      'uranium_nuclear', 'URNM':    'uranium_nuclear',
  'URAN.L':   'uranium_nuclear', 'NUCL.L':  'uranium_nuclear',
  'NUKZ':     'uranium_nuclear', 'NLR':     'uranium_nuclear',
  'URNJ':     'uranium_nuclear', 'HURA.TO': 'uranium_nuclear',
  'ATMU.MI':  'uranium_nuclear', 'URNU.MI': 'uranium_nuclear',

  // Space Economy
  'ARKX':     'space_economy', 'UFO':      'space_economy',
  'ROKT':     'space_economy', 'SPAC.MI':  'space_economy',
  'YODA.MI':  'space_economy', 'XGAL.MI':  'space_economy',
  'DFNS.MI':  'space_economy',

  // European Defense (rearmamento NATO 2026 — molto popolare)
  'NATO.MI':  'european_defense', 'NATO.L':   'european_defense',
  'EUAD.MI':  'european_defense', 'EUAD.L':   'european_defense',
  'MDEF.MI':  'european_defense', 'MDEF.L':   'european_defense',
  'DFEN.MI':  'european_defense', 'NATP.MI':  'european_defense',
  'ENTR.MI':  'european_defense',

  // Copper & Critical Metals
  'COPX':     'copper_miners', 'CPER':    'copper_miners',
  'CPRM.L':   'copper_miners', 'COPA.MI': 'copper_miners',
  'MCOP.MI':  'copper_miners', 'BERG.MI': 'copper_miners',

  // Lithium & Battery Technology
  'LIT':      'lithium_battery', 'BATT':    'lithium_battery',
  'LITM':     'lithium_battery', 'CBEG.MI': 'lithium_battery',
  'BATG.MI':  'lithium_battery', 'LITH.L':  'lithium_battery',
  'BTEK.MI':  'lithium_battery',

  // Biotech
  'IBB':      'biotech', 'XBI':      'biotech',
  'IBTK.MI':  'biotech', 'ISAC.MI':  'biotech',
  'SBIO.MI':  'biotech', 'XBIO.DE':  'biotech',
  'BIOT.L':   'biotech',

  // Solar Energy
  'TAN':      'solar_energy', 'RAYS':     'solar_energy',
  'ISUN.MI':  'solar_energy', 'SOLR.MI':  'solar_energy',
  'IQQH.MI':  'solar_energy', 'PSFR.MI':  'solar_energy',

  // Silver (aggiunta tickers a profilo esistente)
  'PHAG.MI':  'silver_spot', 'PHAG.L':   'silver_spot',
  'VZLD.MI':  'silver_spot', 'PHSP.MI':  'silver_spot',
  'PHSP.L':   'silver_spot', 'SLV':      'silver_spot',
  'SIVR':     'silver_spot', 'XSIL.MI':  'silver_spot',

  // ── Nuovi ETF — espansione giugno 2026 ────────────────────────────────────

  // EM Local Currency Bond
  'SEML.MI': 'em_local_currency_bond', 'SEML.L': 'em_local_currency_bond',
  'EMLE.MI': 'em_local_currency_bond', 'LCCP.MI': 'em_local_currency_bond',
  'SPFJ.DE': 'em_local_currency_bond', 'EMLD.MI': 'em_local_currency_bond',

  // Gold Miners
  'AUCO.MI':  'gold_miners', 'AUCO.L':   'gold_miners',
  'RING.MI':  'gold_miners', 'RING.L':   'gold_miners',
  'GDX':      'gold_miners', 'GDXJ':     'gold_miners',
  'SGDM.MI':  'gold_miners',

  // Aerospace & Defense
  'DFND.MI':  'aerospace_defense', 'DFND.L':  'aerospace_defense',
  'AERO.MI':  'aerospace_defense', 'DFEN.MI': 'aerospace_defense',
  'ITA':      'aerospace_defense', 'XAR':     'aerospace_defense',

  // Megatrends / Multi-theme
  'METU.MI':  'megatrends_global', 'METV.MI': 'megatrends_global',
  'ETLT.MI':  'megatrends_global', 'VANG.MI': 'megatrends_global',
  'MGLB.MI':  'megatrends_global', 'PHRX.MI': 'megatrends_global',

  // MSCI Europe Small Cap
  'IUSP.MI':  'msci_europe_sc', 'IUSP.L':   'msci_europe_sc',
  'SMEA.MI':  'msci_europe_sc', 'SMEA.DE':  'msci_europe_sc',
  'CERX.DE':  'msci_europe_sc', 'XXSC.MI':  'msci_europe_sc',

  // Global Infrastructure
  'INFR.MI':  'global_infrastructure', 'INFR.L':  'global_infrastructure',
  'NFRA.MI':  'global_infrastructure', 'IQQN.DE': 'global_infrastructure',
  'IGF':      'global_infrastructure', 'TOLL.MI': 'global_infrastructure',

  // MSCI EM Asia
  'XMAS.DE':  'msci_em_asia', 'EMXA.MI': 'msci_em_asia',
  'EEMX.MI':  'msci_em_asia', 'AAXJ':    'msci_em_asia',
  'PAASI.MI': 'msci_em_asia',

  // US Short-Term Treasury (1–3yr)
  'IBTS.MI':  'us_short_treasury', 'IBTS.L':  'us_short_treasury',
  'SUST.MI':  'us_short_treasury', 'SHY':     'us_short_treasury',
  'XUST.MI':  'us_short_treasury', 'XSTR.DE': 'us_short_treasury',

  // MSCI World Technology
  'QDVE.MI':  'msci_world_tech', 'QDVE.L':   'msci_world_tech',
  'WTCH.MI':  'msci_world_tech', 'DGTL.MI':  'msci_world_tech',
  'IITU.L':   'msci_world_tech', 'ISPA.DE':  'msci_world_tech',

  // Climate Transition / Paris-Aligned
  'PAWD.MI':  'climate_transition', 'PAWD.L':  'climate_transition',
  'WOSC.MI':  'climate_transition', 'PABW.MI': 'climate_transition',
  'WTEF.MI':  'climate_transition', 'CLIM.MI': 'climate_transition',

  // EUR Short-Term Government Bond (0–3yr)
  'IS4S.DE':  'eur_short_gov', 'EUBB.MI': 'eur_short_gov',
  'XGER.MI':  'eur_short_gov', 'EUGT.MI': 'eur_short_gov',
  'CBU7.MI':  'eur_short_gov',
};

// ── Profili fattoriali per le azioni singole più comuni ─────────────────────
// Scala -2 → +2, coerente con i profili ETF.
// Fonti: Morningstar factor ratings, MSCI factor profiles (maggio 2026).
const COMMON_STOCK_FACTORS = {
  // US Big Tech
  'AAPL':  { value:-0.3, growth: 0.5, momentum: 0.4, quality: 0.8, size:-1.0, lowVol:-0.2, yield:-0.4 },
  'MSFT':  { value:-0.2, growth: 0.6, momentum: 0.3, quality: 1.0, size:-1.0, lowVol: 0.1, yield:-0.3 },
  'NVDA':  { value:-0.8, growth: 1.5, momentum: 1.2, quality: 0.5, size:-0.8, lowVol:-0.8, yield:-0.6 },
  'AMZN':  { value:-0.6, growth: 0.9, momentum: 0.3, quality: 0.3, size:-1.0, lowVol:-0.3, yield:-0.6 },
  'META':  { value:-0.4, growth: 0.8, momentum: 0.7, quality: 0.6, size:-0.9, lowVol:-0.4, yield:-0.5 },
  'GOOGL': { value:-0.3, growth: 0.7, momentum: 0.2, quality: 0.7, size:-1.0, lowVol:-0.1, yield:-0.6 },
  'GOOG':  { value:-0.3, growth: 0.7, momentum: 0.2, quality: 0.7, size:-1.0, lowVol:-0.1, yield:-0.6 },
  'TSLA':  { value:-1.0, growth: 1.0, momentum:-0.2, quality:-0.2, size:-0.8, lowVol:-1.2, yield:-0.8 },
  'AMD':   { value:-0.5, growth: 0.9, momentum: 0.3, quality: 0.1, size:-0.5, lowVol:-0.7, yield:-0.6 },
  'INTC':  { value: 0.4, growth:-0.3, momentum:-0.8, quality:-0.2, size:-0.7, lowVol:-0.2, yield: 0.3 },
  // US Finance / Other
  'BRKB':  { value: 1.2, growth:-0.2, momentum: 0.1, quality: 0.8, size:-1.0, lowVol: 0.3, yield: 0.2 },
  'BRK.B': { value: 1.2, growth:-0.2, momentum: 0.1, quality: 0.8, size:-1.0, lowVol: 0.3, yield: 0.2 },
  'JPM':   { value: 0.5, growth: 0.2, momentum: 0.2, quality: 0.4, size:-0.8, lowVol:-0.3, yield: 0.6 },
  'BAC':   { value: 0.6, growth: 0.0, momentum: 0.2, quality: 0.1, size:-0.8, lowVol:-0.4, yield: 0.4 },
  'V':     { value:-0.2, growth: 0.5, momentum: 0.3, quality: 0.9, size:-0.8, lowVol: 0.2, yield:-0.2 },
  'MA':    { value:-0.3, growth: 0.6, momentum: 0.3, quality: 0.9, size:-0.8, lowVol: 0.1, yield:-0.3 },
  'JNJ':   { value: 0.2, growth:-0.1, momentum:-0.2, quality: 0.7, size:-0.8, lowVol: 0.6, yield: 0.5 },
  'XOM':   { value: 0.8, growth:-0.2, momentum: 0.1, quality: 0.2, size:-0.8, lowVol:-0.2, yield: 0.8 },
  'KO':    { value: 0.3, growth:-0.3, momentum: 0.0, quality: 0.5, size:-0.7, lowVol: 0.8, yield: 0.8 },
  'PG':    { value: 0.1, growth:-0.1, momentum: 0.0, quality: 0.6, size:-0.7, lowVol: 0.7, yield: 0.6 },
  'WMT':   { value:-0.1, growth: 0.2, momentum: 0.3, quality: 0.5, size:-0.8, lowVol: 0.5, yield: 0.3 },
  'TSM':   { value: 0.0, growth: 0.7, momentum: 0.5, quality: 0.7, size:-0.7, lowVol:-0.1, yield: 0.2 },
  'BABA':  { value: 0.3, growth: 0.2, momentum:-0.6, quality: 0.2, size:-0.7, lowVol:-0.5, yield: 0.0 },
  // EU Stocks
  'ASML':  { value:-0.3, growth: 0.8, momentum: 0.2, quality: 0.9, size:-0.7, lowVol:-0.2, yield:-0.1 },
  'LVMH':  { value: 0.0, growth: 0.4, momentum:-0.1, quality: 0.7, size:-0.8, lowVol: 0.1, yield: 0.2 },
  'MC':    { value: 0.0, growth: 0.4, momentum:-0.1, quality: 0.7, size:-0.8, lowVol: 0.1, yield: 0.2 }, // Euronext ticker
  'SAP':   { value:-0.1, growth: 0.6, momentum: 0.4, quality: 0.7, size:-0.6, lowVol: 0.1, yield:-0.1 },
  'NOVO':  { value:-0.4, growth: 0.9, momentum: 0.3, quality: 0.8, size:-0.7, lowVol: 0.1, yield:-0.1 },
  'NOVOB': { value:-0.4, growth: 0.9, momentum: 0.3, quality: 0.8, size:-0.7, lowVol: 0.1, yield:-0.1 },
  'NESN':  { value: 0.2, growth:-0.1, momentum:-0.2, quality: 0.6, size:-0.7, lowVol: 0.5, yield: 0.5 },
  'ROG':   { value: 0.3, growth: 0.1, momentum:-0.3, quality: 0.7, size:-0.7, lowVol: 0.4, yield: 0.4 },
  'OR':    { value: 0.0, growth: 0.3, momentum: 0.0, quality: 0.7, size:-0.7, lowVol: 0.4, yield: 0.3 },
  'SHELL': { value: 0.7, growth:-0.1, momentum: 0.0, quality: 0.3, size:-0.8, lowVol:-0.1, yield: 0.7 },
  'BP':    { value: 0.8, growth:-0.2, momentum:-0.1, quality: 0.1, size:-0.7, lowVol:-0.2, yield: 0.8 },
  'TTE':   { value: 0.6, growth:-0.1, momentum: 0.1, quality: 0.3, size:-0.7, lowVol:-0.1, yield: 0.7 },
  'ENI':   { value: 0.7, growth:-0.1, momentum: 0.1, quality: 0.2, size:-0.6, lowVol:-0.1, yield: 0.7 },
  'ENEL':  { value: 0.2, growth: 0.0, momentum:-0.1, quality: 0.3, size:-0.5, lowVol: 0.4, yield: 0.6 },
  'SIE':   { value: 0.2, growth: 0.4, momentum: 0.1, quality: 0.5, size:-0.6, lowVol: 0.1, yield: 0.3 },
  'ALV':   { value: 0.3, growth: 0.1, momentum: 0.1, quality: 0.5, size:-0.6, lowVol: 0.2, yield: 0.5 },
  'BNP':   { value: 0.7, growth: 0.0, momentum: 0.2, quality: 0.1, size:-0.6, lowVol:-0.3, yield: 0.5 },
  'ISP':   { value: 0.6, growth: 0.1, momentum: 0.3, quality: 0.2, size:-0.5, lowVol:-0.2, yield: 0.6 },
  'UCG':   { value: 0.7, growth: 0.1, momentum: 0.4, quality: 0.2, size:-0.5, lowVol:-0.2, yield: 0.5 },
  'BMW':   { value: 0.7, growth: 0.0, momentum:-0.2, quality: 0.2, size:-0.6, lowVol:-0.1, yield: 0.5 },
  'VOW3':  { value: 0.8, growth:-0.1, momentum:-0.3, quality: 0.1, size:-0.6, lowVol:-0.2, yield: 0.5 },
  'STLAM': { value: 0.5, growth:-0.1, momentum:-0.4, quality: 0.1, size:-0.5, lowVol:-0.3, yield: 0.3 },
  'HSBA':  { value: 0.6, growth:-0.1, momentum: 0.1, quality: 0.2, size:-0.7, lowVol:-0.1, yield: 0.7 },
  'PRY':   { value: 0.1, growth: 0.0, momentum:-0.1, quality: 0.4, size:-0.3, lowVol: 0.1, yield: 0.4 },
  // Italian stocks
  'RACE':  { value:-0.3, growth: 0.5, momentum: 0.2, quality: 0.9, size:-0.4, lowVol: 0.3, yield:-0.2 }, // Ferrari
  'LDO':   { value: 0.2, growth: 0.4, momentum: 0.3, quality: 0.4, size:-0.3, lowVol:-0.1, yield: 0.3 }, // Leonardo
  'TRN':   { value: 0.3, growth: 0.1, momentum: 0.0, quality: 0.5, size:-0.3, lowVol: 0.7, yield: 0.7 }, // Terna
  'SRG':   { value: 0.3, growth: 0.0, momentum:-0.1, quality: 0.5, size:-0.3, lowVol: 0.7, yield: 0.8 }, // Snam
  'MONC':  { value:-0.2, growth: 0.5, momentum: 0.0, quality: 0.7, size:-0.2, lowVol: 0.2, yield: 0.1 }, // Moncler
  'ERG':   { value: 0.1, growth: 0.2, momentum: 0.0, quality: 0.3, size:-0.1, lowVol: 0.4, yield: 0.5 }, // ERG Spa
  'STM':   { value:-0.1, growth: 0.4, momentum:-0.3, quality: 0.2, size:-0.3, lowVol:-0.5, yield: 0.1 }, // STMicroelectronics
  'A2A':   { value: 0.4, growth: 0.1, momentum: 0.1, quality: 0.3, size:-0.1, lowVol: 0.5, yield: 0.7 }, // A2A utility
  'AMP':   { value: 0.2, growth: 0.1, momentum: 0.0, quality: 0.3, size: 0.0, lowVol: 0.4, yield: 0.6 }, // Amplifon approx
  'PIRC':  { value: 0.3, growth: 0.1, momentum:-0.1, quality: 0.3, size:-0.1, lowVol: 0.1, yield: 0.4 }, // Pirelli
  // Swiss stocks
  'ZURN':  { value: 0.2, growth: 0.1, momentum: 0.2, quality: 0.6, size:-0.5, lowVol: 0.5, yield: 0.6 }, // Zurich Insurance
  'GIVN':  { value:-0.1, growth: 0.4, momentum: 0.0, quality: 0.6, size:-0.3, lowVol: 0.3, yield: 0.2 }, // Givaudan
  // Other Europe
  'AI':    { value: 0.1, growth: 0.2, momentum: 0.1, quality: 0.6, size:-0.5, lowVol: 0.4, yield: 0.3 }, // Air Liquide
  'RMS':   { value:-0.1, growth: 0.6, momentum: 0.3, quality: 0.9, size:-0.5, lowVol: 0.2, yield:-0.1 }, // Hermès
  'INGA':  { value: 0.6, growth: 0.0, momentum: 0.3, quality: 0.2, size:-0.6, lowVol:-0.2, yield: 0.5 }, // ING Groep
  'PHIA':  { value: 0.3, growth:-0.2, momentum:-0.4, quality: 0.1, size:-0.5, lowVol:-0.3, yield: 0.5 }, // Philips
  'DB1':   { value: 0.3, growth: 0.3, momentum: 0.3, quality: 0.5, size:-0.4, lowVol: 0.1, yield: 0.3 }, // Deutsche Börse
  'ADS':   { value:-0.2, growth: 0.4, momentum:-0.1, quality: 0.3, size:-0.4, lowVol:-0.2, yield: 0.1 }, // Adidas
  'IFX':   { value: 0.0, growth: 0.3, momentum:-0.2, quality: 0.2, size:-0.3, lowVol:-0.4, yield: 0.2 }, // Infineon Technologies
  'RWE':   { value: 0.2, growth: 0.2, momentum:-0.2, quality: 0.3, size:-0.5, lowVol: 0.4, yield: 0.5 }, // RWE
  // UK stocks (base tickers without exchange suffix)
  'LLOY':  { value: 0.8, growth:-0.1, momentum: 0.2, quality: 0.1, size:-0.5, lowVol:-0.3, yield: 0.5 }, // Lloyds
  'BARC':  { value: 0.7, growth: 0.0, momentum: 0.2, quality: 0.1, size:-0.6, lowVol:-0.4, yield: 0.5 }, // Barclays
  'AAL':   { value: 0.5, growth: 0.0, momentum: 0.0, quality: 0.1, size:-0.4, lowVol:-0.4, yield: 0.4 }, // Anglo American
  'DGE':   { value: 0.3, growth: 0.0, momentum:-0.2, quality: 0.5, size:-0.6, lowVol: 0.3, yield: 0.5 }, // Diageo
  'ULVR':  { value: 0.1, growth: 0.0, momentum:-0.1, quality: 0.5, size:-0.7, lowVol: 0.5, yield: 0.5 }, // Unilever
  'REL':   { value: 0.0, growth: 0.3, momentum: 0.2, quality: 0.7, size:-0.4, lowVol: 0.3, yield: 0.2 }, // Relx
  'BA':    { value: 0.3, growth: 0.2, momentum: 0.2, quality: 0.4, size:-0.5, lowVol: 0.0, yield: 0.3 }, // BAE Systems
  // Canada
  'RY':    { value: 0.4, growth: 0.2, momentum: 0.2, quality: 0.6, size:-0.7, lowVol: 0.3, yield: 0.5 }, // Royal Bank of Canada
  'TD':    { value: 0.4, growth: 0.1, momentum: 0.1, quality: 0.5, size:-0.7, lowVol: 0.2, yield: 0.5 }, // TD Bank
  'SHOP':  { value:-0.8, growth: 1.0, momentum: 0.5, quality: 0.2, size:-0.5, lowVol:-0.6, yield:-0.8 }, // Shopify
  // Japan
  'SONY':  { value:-0.1, growth: 0.4, momentum: 0.3, quality: 0.5, size:-0.6, lowVol: 0.0, yield: 0.1 }, // Sony
  'TM':    { value: 0.3, growth: 0.1, momentum: 0.0, quality: 0.5, size:-0.8, lowVol: 0.2, yield: 0.3 }, // Toyota
  '7203':  { value: 0.3, growth: 0.1, momentum: 0.0, quality: 0.5, size:-0.8, lowVol: 0.2, yield: 0.3 }, // Toyota (TSE)
  '9984':  { value:-0.5, growth: 0.8, momentum: 0.4, quality: 0.1, size:-0.7, lowVol:-0.5, yield:-0.3 }, // SoftBank
  // ── Nuovi stock factors — giugno 2026 ──────────────────────────────────────
  // US tech / growth
  'UBER':  { value:-0.3, growth: 0.8, momentum: 0.6, quality: 0.2, size:-0.6, lowVol:-0.5, yield:-0.7 }, // Uber
  'PLTR':  { value:-0.8, growth: 0.9, momentum: 0.8, quality: 0.1, size:-0.5, lowVol:-0.7, yield:-0.8 }, // Palantir
  'NFLX':  { value:-0.3, growth: 0.7, momentum: 0.5, quality: 0.5, size:-0.7, lowVol:-0.3, yield:-0.7 }, // Netflix
  'COIN':  { value:-0.6, growth: 1.0, momentum: 0.9, quality:-0.3, size:-0.4, lowVol:-1.2, yield:-0.8 }, // Coinbase
  'PANW':  { value:-0.5, growth: 0.9, momentum: 0.4, quality: 0.4, size:-0.5, lowVol:-0.4, yield:-0.7 }, // Palo Alto Networks
  'ARM':   { value:-0.9, growth: 1.2, momentum: 0.7, quality: 0.7, size:-0.5, lowVol:-0.6, yield:-0.8 }, // ARM Holdings
  'SNOW':  { value:-1.0, growth: 1.1, momentum: 0.2, quality: 0.0, size:-0.5, lowVol:-0.6, yield:-0.8 }, // Snowflake
  'SMCI':  { value:-0.4, growth: 1.3, momentum: 0.0, quality: 0.1, size:-0.3, lowVol:-1.0, yield:-0.7 }, // Super Micro
  'MSTR':  { value:-1.0, growth: 0.5, momentum: 1.0, quality:-0.5, size:-0.2, lowVol:-1.5, yield:-1.0 }, // MicroStrategy
  // US consumer / other
  'COST':  { value: 0.0, growth: 0.4, momentum: 0.5, quality: 0.8, size:-0.8, lowVol: 0.5, yield: 0.1 }, // Costco
  'WMT':   { value: 0.1, growth: 0.3, momentum: 0.4, quality: 0.8, size:-0.9, lowVol: 0.6, yield: 0.2 }, // Walmart
  'DIS':   { value: 0.0, growth: 0.1, momentum:-0.2, quality: 0.2, size:-0.8, lowVol:-0.1, yield: 0.0 }, // Disney
  'PYPL':  { value:-0.2, growth: 0.3, momentum:-0.1, quality: 0.3, size:-0.6, lowVol:-0.3, yield:-0.5 }, // PayPal
  'SQ':    { value:-0.7, growth: 0.8, momentum: 0.3, quality:-0.1, size:-0.4, lowVol:-0.6, yield:-0.8 }, // Block (Square)
  // US industrial / energy
  'CAT':   { value: 0.3, growth: 0.2, momentum: 0.3, quality: 0.5, size:-0.7, lowVol: 0.0, yield: 0.3 }, // Caterpillar
  'HON':   { value: 0.1, growth: 0.2, momentum: 0.1, quality: 0.6, size:-0.7, lowVol: 0.2, yield: 0.2 }, // Honeywell
  'XOM':   { value: 0.8, growth:-0.1, momentum: 0.2, quality: 0.4, size:-0.9, lowVol: 0.0, yield: 0.7 }, // ExxonMobil
  'CVX':   { value: 0.7, growth:-0.1, momentum: 0.2, quality: 0.4, size:-0.8, lowVol: 0.1, yield: 0.6 }, // Chevron
  // European stocks
  'NOVN':  { value: 0.3, growth: 0.2, momentum: 0.0, quality: 0.7, size:-0.7, lowVol: 0.5, yield: 0.5 }, // Novartis (SW)
  'NOVN.SW':{ value: 0.3, growth: 0.2, momentum: 0.0, quality: 0.7, size:-0.7, lowVol: 0.5, yield: 0.5 },
  'ABB':   { value: 0.1, growth: 0.4, momentum: 0.4, quality: 0.7, size:-0.6, lowVol: 0.1, yield: 0.2 }, // ABB (CH)
  'ABB.SW':{ value: 0.1, growth: 0.4, momentum: 0.4, quality: 0.7, size:-0.6, lowVol: 0.1, yield: 0.2 },
  'ORA':   { value: 0.2, growth: 0.1, momentum: 0.2, quality: 0.3, size:-0.5, lowVol: 0.3, yield: 0.5 }, // Orange (France Telecom)
  'ORA.PA':{ value: 0.2, growth: 0.1, momentum: 0.2, quality: 0.3, size:-0.5, lowVol: 0.3, yield: 0.5 },
  'BAYN':  { value: 0.4, growth:-0.2, momentum:-0.6, quality: 0.0, size:-0.6, lowVol:-0.2, yield: 0.5 }, // Bayer
  'BAYN.DE':{ value: 0.4, growth:-0.2, momentum:-0.6, quality: 0.0, size:-0.6, lowVol:-0.2, yield: 0.5 },
  'ALV':   { value: 0.4, growth: 0.2, momentum: 0.3, quality: 0.6, size:-0.6, lowVol: 0.2, yield: 0.5 }, // Allianz
  'ALV.DE':{ value: 0.4, growth: 0.2, momentum: 0.3, quality: 0.6, size:-0.6, lowVol: 0.2, yield: 0.5 },
  'MUV2':  { value: 0.4, growth: 0.2, momentum: 0.2, quality: 0.7, size:-0.6, lowVol: 0.3, yield: 0.5 }, // Munich Re
  // Italian stocks
  'TIT':   { value: 0.5, growth:-0.3, momentum:-0.2, quality:-0.1, size:-0.4, lowVol:-0.2, yield: 0.3 }, // Telecom Italia
  'TIT.MI':{ value: 0.5, growth:-0.3, momentum:-0.2, quality:-0.1, size:-0.4, lowVol:-0.2, yield: 0.3 },
  'MB':    { value: 0.4, growth: 0.3, momentum: 0.4, quality: 0.5, size:-0.4, lowVol: 0.0, yield: 0.4 }, // Mediobanca
  'MB.MI': { value: 0.4, growth: 0.3, momentum: 0.4, quality: 0.5, size:-0.4, lowVol: 0.0, yield: 0.4 },
  'PST':   { value: 0.3, growth: 0.1, momentum: 0.2, quality: 0.5, size:-0.4, lowVol: 0.3, yield: 0.6 }, // Poste Italiane
  'PST.MI':{ value: 0.3, growth: 0.1, momentum: 0.2, quality: 0.5, size:-0.4, lowVol: 0.3, yield: 0.6 },
  'ATL':   { value: 0.2, growth: 0.1, momentum: 0.3, quality: 0.4, size:-0.5, lowVol: 0.2, yield: 0.4 }, // Atlantia/Mundys
  'PRY':   { value: 0.2, growth: 0.2, momentum: 0.1, quality: 0.4, size:-0.3, lowVol: 0.0, yield: 0.3 }, // Prysmian
  'PRY.MI':{ value: 0.2, growth: 0.2, momentum: 0.1, quality: 0.4, size:-0.3, lowVol: 0.0, yield: 0.3 },
  'BMED':  { value: 0.3, growth: 0.0, momentum: 0.2, quality: 0.3, size:-0.3, lowVol: 0.2, yield: 0.5 }, // Banco BPM
  'BMED.MI':{ value: 0.3, growth: 0.0, momentum: 0.2, quality: 0.3, size:-0.3, lowVol: 0.2, yield: 0.5 },
  // ── Stock factors — ETF virali luglio 2026 ────────────────────────────────
  // European Defense
  'RHM':    { value: 0.1, growth: 0.6, momentum: 1.2, quality: 0.5, size:-0.5, lowVol:-0.4, yield: 0.2 }, // Rheinmetall
  'RHM.DE': { value: 0.1, growth: 0.6, momentum: 1.2, quality: 0.5, size:-0.5, lowVol:-0.4, yield: 0.2 },
  'BA.L':   { value: 0.3, growth: 0.3, momentum: 0.7, quality: 0.5, size:-0.6, lowVol:-0.1, yield: 0.3 }, // BAE Systems (London)
  'HO':     { value: 0.0, growth: 0.4, momentum: 0.6, quality: 0.6, size:-0.6, lowVol: 0.0, yield: 0.2 }, // Thales
  'HO.PA':  { value: 0.0, growth: 0.4, momentum: 0.6, quality: 0.6, size:-0.6, lowVol: 0.0, yield: 0.2 },
  'SAAB':   { value: 0.2, growth: 0.5, momentum: 0.8, quality: 0.4, size:-0.3, lowVol:-0.2, yield: 0.2 }, // Saab AB
  'SAAB.ST':{ value: 0.2, growth: 0.5, momentum: 0.8, quality: 0.4, size:-0.3, lowVol:-0.2, yield: 0.2 },
  // Uranium / Nuclear
  'CCJ':    { value: 0.1, growth: 0.3, momentum: 0.9, quality: 0.2, size:-0.4, lowVol:-0.8, yield: 0.0 }, // Cameco (NYSE)
  'CCO':    { value: 0.1, growth: 0.3, momentum: 0.9, quality: 0.2, size:-0.4, lowVol:-0.8, yield: 0.0 }, // Cameco (TSX)
  'CCO.TO': { value: 0.1, growth: 0.3, momentum: 0.9, quality: 0.2, size:-0.4, lowVol:-0.8, yield: 0.0 },
  'NXE':    { value:-0.3, growth: 0.5, momentum: 0.7, quality:-0.1, size: 0.3, lowVol:-1.0, yield:-0.8 }, // NexGen Energy
  'UEC':    { value:-0.2, growth: 0.4, momentum: 0.6, quality:-0.2, size: 0.4, lowVol:-1.1, yield:-0.8 }, // Uranium Energy Corp
  // Copper miners
  'FCX':    { value: 0.3, growth: 0.2, momentum: 0.5, quality: 0.2, size:-0.6, lowVol:-0.5, yield: 0.2 }, // Freeport-McMoRan
  'SCCO':   { value: 0.4, growth: 0.2, momentum: 0.4, quality: 0.3, size:-0.5, lowVol:-0.3, yield: 0.4 }, // Southern Copper
  'ANTM':   { value: 0.3, growth: 0.1, momentum: 0.2, quality: 0.2, size:-0.4, lowVol:-0.4, yield: 0.2 }, // Antofagasta
  'ANTO':   { value: 0.3, growth: 0.1, momentum: 0.2, quality: 0.2, size:-0.4, lowVol:-0.4, yield: 0.2 }, // Antofagasta (London)
  // Lithium & Battery
  'ALB':    { value: 0.2, growth: 0.5, momentum:-0.3, quality: 0.2, size:-0.5, lowVol:-0.7, yield: 0.1 }, // Albemarle
  'SQM':    { value: 0.3, growth: 0.4, momentum:-0.2, quality: 0.2, size:-0.4, lowVol:-0.6, yield: 0.3 }, // Sociedad Quimica
  'PLL':    { value:-0.2, growth: 0.5, momentum:-0.4, quality:-0.3, size: 0.5, lowVol:-1.2, yield:-0.8 }, // Piedmont Lithium
  'LAC':    { value:-0.3, growth: 0.4, momentum:-0.3, quality:-0.4, size: 0.4, lowVol:-1.1, yield:-0.8 }, // Lithium Americas
  // Biotech
  'MRNA':   { value:-0.6, growth: 0.5, momentum:-0.5, quality:-0.1, size:-0.4, lowVol:-0.8, yield:-0.7 }, // Moderna
  'BNTX':   { value:-0.4, growth: 0.4, momentum:-0.3, quality: 0.1, size:-0.4, lowVol:-0.6, yield:-0.5 }, // BioNTech
  'REGN':   { value: 0.0, growth: 0.5, momentum: 0.3, quality: 0.7, size:-0.5, lowVol:-0.1, yield:-0.3 }, // Regeneron
  'VRTX':   { value: 0.0, growth: 0.6, momentum: 0.3, quality: 0.7, size:-0.5, lowVol:-0.1, yield:-0.4 }, // Vertex
  'GILD':   { value: 0.3, growth: 0.1, momentum:-0.1, quality: 0.5, size:-0.6, lowVol: 0.2, yield: 0.4 }, // Gilead
  'BIIB':   { value: 0.1, growth: 0.2, momentum:-0.2, quality: 0.3, size:-0.5, lowVol:-0.1, yield:-0.2 }, // Biogen
  // Space & Aerospace
  'RKLB':   { value:-1.0, growth: 1.3, momentum: 0.8, quality:-0.5, size: 0.5, lowVol:-1.3, yield:-1.0 }, // Rocket Lab
  'ASTS':   { value:-1.0, growth: 1.5, momentum: 1.0, quality:-0.8, size: 0.6, lowVol:-1.5, yield:-1.0 }, // AST SpaceMobile
  'LMT':    { value: 0.3, growth: 0.1, momentum: 0.1, quality: 0.5, size:-0.7, lowVol: 0.2, yield: 0.3 }, // Lockheed Martin
  'NOC':    { value: 0.2, growth: 0.1, momentum: 0.1, quality: 0.5, size:-0.7, lowVol: 0.3, yield: 0.2 }, // Northrop Grumman
  'GD':     { value: 0.3, growth: 0.2, momentum: 0.1, quality: 0.6, size:-0.7, lowVol: 0.1, yield: 0.3 }, // General Dynamics
  // Solar Energy
  'FSLR':   { value:-0.2, growth: 0.7, momentum: 0.0, quality: 0.4, size:-0.4, lowVol:-0.5, yield:-0.3 }, // First Solar
  'ENPH':   { value:-0.3, growth: 0.8, momentum:-0.4, quality: 0.3, size:-0.3, lowVol:-0.8, yield:-0.5 }, // Enphase Energy
  'SEDG':   { value:-0.4, growth: 0.5, momentum:-0.7, quality:-0.1, size:-0.2, lowVol:-1.0, yield:-0.6 }, // SolarEdge
  'RUN':    { value:-0.5, growth: 0.6, momentum:-0.3, quality:-0.3, size:-0.2, lowVol:-0.8, yield:-0.8 }, // Sunrun
  // AI chip & infra
  'AVGO':   { value: 0.0, growth: 0.7, momentum: 0.6, quality: 0.7, size:-0.7, lowVol:-0.1, yield: 0.1 }, // Broadcom
  'QCOM':   { value: 0.2, growth: 0.5, momentum: 0.3, quality: 0.6, size:-0.6, lowVol:-0.1, yield: 0.2 }, // Qualcomm
  'MU':     { value: 0.2, growth: 0.6, momentum: 0.4, quality: 0.2, size:-0.5, lowVol:-0.5, yield: 0.1 }, // Micron Technology
  // ── Stock factors — Titoli aggiuntivi portafoglio ────────────────────────────
  'ANET':   { value:-0.1, growth: 0.8, momentum: 0.7, quality: 0.8, size:-0.5, lowVol:-0.2, yield:-0.5 }, // Arista Networks
  'DUOL':   { value:-0.8, growth: 1.2, momentum: 0.5, quality:-0.1, size: 0.1, lowVol:-0.9, yield:-1.0 }, // Duolingo
  'MTE':    { value: 0.2, growth: 0.6, momentum: 0.4, quality: 0.2, size:-0.5, lowVol:-0.5, yield: 0.1 }, // ⚠️ Ticker sospetto — controlla se è davvero Micron (ticker corretto: MU)
  'FN':     { value: 0.1, growth: 0.5, momentum: 0.4, quality: 0.6, size:-0.2, lowVol:-0.3, yield:-0.3 }, // Fabrinet
  'COHR':   { value: 0.0, growth: 0.6, momentum: 0.3, quality: 0.2, size:-0.4, lowVol:-0.5, yield:-0.4 }, // Coherent Corp
  // TICKER_PROFILE entries for individual Italian stocks
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE_STOCK_PROFILES — database qualitativo per azioni singole
// Questo è il MOAT: aggiungi qui le tue tesi, rating, note personali.
// Schema: { name, sector, subSector, geography, marketCap,
//           moatRating (1-5), moatType[], businessModel, thesis, addedDate }
// ─────────────────────────────────────────────────────────────────────────────
export const SINGLE_STOCK_PROFILES = {
  'ANET': {
    name: 'Arista Networks',
    sector: 'Technology',
    subSector: 'Cloud Networking',
    geography: 'US',
    marketCap: 'Large Cap',
    moatRating: 5,
    moatType: ['Switching costs', 'Economies of scale'],
    businessModel: 'Hardware (switches/router) + EOS software per data center hyperscaler. Quota dominante nei cluster AI di Meta, Microsoft, Google.',
    thesis: '',
    addedDate: '2026-07-08',
  },
  'DUOL': {
    name: 'Duolingo',
    sector: 'Technology',
    subSector: 'EdTech / Consumer',
    geography: 'US',
    marketCap: 'Mid Cap',
    moatRating: 3,
    moatType: ['Network effects', 'Brand'],
    businessModel: 'App di apprendimento lingue freemium. Revenue da subscription (Duolingo Max/Super) e pubblicità. Crescita MAU forte, monetizzazione ancora in corso.',
    thesis: '',
    addedDate: '2026-07-08',
  },
  'FN': {
    name: 'Fabrinet',
    sector: 'Technology',
    subSector: 'Contract Manufacturing / Optical',
    geography: 'US (operations: Thailand)',
    marketCap: 'Mid Cap',
    moatRating: 3,
    moatType: ['Switching costs', 'Precision manufacturing expertise'],
    businessModel: 'Contract manufacturer specializzato in componenti ottici ad alta precisione per networking, laser medicali, industriali. Cliente principale: Coherent, Lumentum, Nvidia NVLink.',
    thesis: '',
    addedDate: '2026-07-08',
  },
  'COHR': {
    name: 'Coherent Corp',
    sector: 'Technology',
    subSector: 'Photonics / Optical Components',
    geography: 'US',
    marketCap: 'Mid Cap',
    moatRating: 3,
    moatType: ['Switching costs', 'IP / Technology'],
    businessModel: 'Produttore di laser, ottiche e componenti footonici per telecom, data center (transceiver 400G/800G), semiconduttori e industriale. Merger II-VI + Coherent 2022.',
    thesis: '',
    addedDate: '2026-07-08',
  },
  'MU': {
    name: 'Micron Technology',
    sector: 'Technology',
    subSector: 'Memory Semiconductors',
    geography: 'US',
    marketCap: 'Large Cap',
    moatRating: 3,
    moatType: ['Economies of scale', 'Capital barriers to entry'],
    businessModel: 'Produttore di DRAM e NAND flash. Uno dei 3 player globali (Samsung, SK Hynix, Micron). Ciclico ma critico per AI (HBM per GPU Nvidia).',
    thesis: '',
    addedDate: '2026-07-08',
  },
};

/**
 * Lookup composition profile for a ticker.
 * Checks ETF profiles first, then common individual stock factor profiles.
 * @param {string} ticker
 * @returns {object|null}
 */
export function getCompositionProfile(ticker, macroCategory) {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  const key = TICKER_PROFILE[t] ?? TICKER_PROFILE[ticker];
  if (key && PROFILES[key]) return PROFILES[key];

  // Fallback: common individual stock factors (exact match), attach rich profile separately
  if (COMMON_STOCK_FACTORS[t]) {
    return {
      assetType: 'equity',
      factors: COMMON_STOCK_FACTORS[t],
      _isDirectStock: true,
      _richProfile: SINGLE_STOCK_PROFILES[t] || null,
    };
  }

  // Try stripping exchange suffix (e.g., ISP.MI → ISP, TTE.PA → TTE, SAP.DE → SAP)
  const baseT = t.replace(/\.(MI|L|PA|DE|AS|SN|VI|BR|LS|SW|ST|MC|HE|CO|AX|T|TO|OQ|N|O)$/, '');
  if (baseT !== t) {
    const baseKey = TICKER_PROFILE[baseT];
    if (baseKey && PROFILES[baseKey]) return PROFILES[baseKey];
    if (COMMON_STOCK_FACTORS[baseT]) {
      return {
        assetType: 'equity',
        factors: COMMON_STOCK_FACTORS[baseT],
        _isDirectStock: true,
        _richProfile: SINGLE_STOCK_PROFILES[baseT] || null,
      };
    }
  }

  // Il portafoglio salva spesso il ticker SENZA suffisso (VHYL) ma il DB lo ha
  // con suffisso di borsa (VHYL.MI). Prova ad aggiungere i suffissi europei comuni.
  if (!t.includes('.')) {
    for (const sfx of ['.MI', '.DE', '.L', '.AS', '.PA']) {
      const withSfx = TICKER_PROFILE[t + sfx];
      if (withSfx && PROFILES[withSfx]) return PROFILES[withSfx];
    }
  }

  // ── Fallback geografico automatico per qualsiasi azione non mappata ─────────
  // Non restituiamo null ma un profilo generico basato sul suffisso del ticker,
  // così nessuna azione finisce nel warning "senza dati di composizione".
  if (macroCategory && macroCategory !== 'Azioni' && macroCategory !== 'Cash') {
    // Non è un'azione singola: lasciamo che il chiamante gestisca
    return null;
  }

  const suffix = t.match(/\.([A-Z0-9]+)$/)?.[1] ?? '';
  if (suffix === 'L')                                return PROFILES['_fallback_uk'];
  if (['DE','F','XETRA'].includes(suffix))           return PROFILES['_fallback_eu_eur'];
  if (['MI','PA','AS','BR','MC','VI','LS','HE','CO','ST','SW'].includes(suffix)) return PROFILES['_fallback_eu_eur'];
  if (suffix === 'T' || suffix === 'TO')             return PROFILES['_fallback_jp'];
  if (suffix === 'AX')                               return { ...PROFILES['_fallback_other'], geography: [{ country: 'Australia', pct: 100 }], currencies: [{ code: 'AUD', name: 'Dollaro australiano', pct: 100 }] };
  // Nessun suffisso o suffissi USA (.N, .O, .OQ, .Q) → azione USA
  return PROFILES['_fallback_us'];
}

/**
 * Derive a micro sub-category from a ticker's profile.
 * Used for second-level allocation breakdown (e.g. "equity → emerging").
 * @param {string} ticker
 * @returns {string}  one of the keys in MICRO_SUB_CATEGORIES
 */
export function getSubCategory(ticker) {
  const profile = getCompositionProfile(ticker);
  if (!profile) return 'altro';

  switch (profile.assetType) {
    case 'equity': {
      if (profile._isDirectStock) return 'equity_single';
      const emPct = profile.marketType?.find(m => m.type === 'Mercati emergenti')?.pct ?? 0;
      if (emPct > 50) return 'equity_emerging';
      // Settoriale/tematico: flag esplicito _isSectorETF (Water, Semiconduttori,
      // Copper Miners…) OPPURE un settore GICS dominante ≥55%.
      // Un indice ampio non ha nessun settore sopra ~30%.
      if (profile._isSectorETF) return 'equity_sector';
      if (profile.sectors && profile.sectors.length > 0) {
        const topSector = profile.sectors.reduce((a, b) => (b.pct > a.pct ? b : a), profile.sectors[0]);
        if (topSector.pct >= 55) return 'equity_sector';
      }
      // Factor / smart-beta: any factor score ≥ 0.8 absolute value
      if (profile.factors) {
        const maxF = Math.max(...Object.values(profile.factors).map(v => Math.abs(v)));
        if (maxF >= 0.8) return 'equity_factor';
      }
      const naPct  = profile.area?.find(a => a.name === 'Nord America')?.pct ?? 0;
      const eurPct = profile.area?.find(a => a.name === 'Europa')?.pct ?? 0;
      if (naPct > 75) return 'equity_us';
      if (eurPct > 55) return 'equity_europe';
      return 'equity_world'; // global developed
    }
    case 'bond': {
      const type = (profile.bondInfo?.type ?? '').toLowerCase();
      if (type.includes('high yield') || type.includes('hy')) return 'bond_hy';
      if (type.includes('inflation') || type.includes('inflazione')) return 'bond_il';
      if (type.includes('corporate') || type.includes('corp')) return 'bond_corp';
      if (type.includes('governativo') || type.includes('government')) {
        if (type.includes('eur') || type.includes('euro')) return 'bond_gov_eur';
        return 'bond_gov_global';
      }
      return 'bond_other';
    }
    case 'commodity': return 'commodity';
    case 'real-estate': return 'realestate';
    case 'crypto': return 'crypto';
    case 'money-market': return 'cash';
    case 'multi-asset': return 'multi_asset';
    default: return 'altro';
  }
}

/**
 * Human-readable labels for sub-categories.
 */
export const MICRO_SUB_CATEGORIES = {
  equity_world:    { label: 'Azionario globale/sviluppato', color: '#0A84FF', macro: 'equity' },
  equity_us:       { label: 'Azionario USA',                color: '#32ADE6', macro: 'equity' },
  equity_europe:   { label: 'Azionario Europa',             color: '#5E5CE6', macro: 'equity' },
  equity_emerging: { label: 'Azionario emergente',          color: '#64D2FF', macro: 'equity' },
  equity_factor:   { label: 'Azionario fattoriale',         color: '#BF5AF2', macro: 'equity' },
  equity_sector:   { label: 'Azionario settoriale',         color: '#FF9F0A', macro: 'equity' },
  equity_single:   { label: 'Azioni singole',               color: '#AC8E68', macro: 'equity' },
  bond_gov_eur:    { label: 'Obbligaz. gov. EUR',           color: '#30D158', macro: 'bond'   },
  bond_gov_global: { label: 'Obbligaz. gov. globale',       color: '#4CD964', macro: 'bond'   },
  bond_corp:       { label: 'Obbligaz. corporate',          color: '#FFD60A', macro: 'bond'   },
  bond_hy:         { label: 'Obbligaz. high yield',         color: '#FF6961', macro: 'bond'   },
  bond_il:         { label: 'Obbligaz. inflation-linked',   color: '#5AC8FA', macro: 'bond'   },
  bond_other:      { label: 'Obbligaz. altro',              color: '#8E8E93', macro: 'bond'   },
  commodity:       { label: 'Materie prime',                color: '#FF9F0A', macro: 'commodity' },
  realestate:      { label: 'Immobiliare (REIT)',            color: '#BF5AF2', macro: 'realEstate' },
  crypto:          { label: 'Crypto',                       color: '#FF453A', macro: 'crypto' },
  cash:            { label: 'Liquidità',                    color: '#32ADE6', macro: 'cash'   },
  multi_asset:     { label: 'Multi-asset',                  color: '#AC8E68', macro: 'equity' },
  altro:           { label: 'Altro / no dati',              color: '#636366', macro: null      },
};

/**
 * Aggregate portfolio composition weighted by market value.
 * Returns blended geo / currency / sector / marketType / area / factors breakdown + coverage stats.
 *
 * @param {Array} holdings  - [{ticker, marketValue, name, macroCategory, ...}]
 * @returns {object}
 */
export function aggregatePortfolioComposition(holdings) {
  const nonCash = holdings.filter(h => !h.isCash && h.marketValue > 0);
  const totalValue = nonCash.reduce((s, h) => s + h.marketValue, 0);

  if (totalValue === 0) return null;

  const geoMap = {};
  const currMap = {};
  const sectorMap = {};
  const marketTypeMap = {};
  const areaMap = {};
  const factorTotals = { value: 0, growth: 0, momentum: 0, quality: 0, size: 0, lowVol: 0, yield: 0 };

  let coveredValue = 0;
  let sectorCoveredValue = 0;
  let factorCoveredValue = 0;
  let marketTypeCoveredValue = 0;
  const uncovered = [];

  nonCash.forEach(h => {
    const profile = getCompositionProfile(h.ticker);
    const w = h.marketValue / totalValue; // portfolio weight [0..1]

    if (!profile) {
      uncovered.push({ ticker: h.ticker, name: h.name, weight: w * 100 });
      return;
    }

    coveredValue += h.marketValue;

    // Geography
    if (profile.geography && profile.geography.length > 0) {
      profile.geography.forEach(g => {
        const key = g.country || g.name;
        if (!key) return;
        geoMap[key] = (geoMap[key] || 0) + g.pct * w;
      });
    }

    // Currencies
    if (profile.currencies && profile.currencies.length > 0) {
      profile.currencies.forEach(c => {
        const key = c.code;
        if (!currMap[key]) currMap[key] = { code: c.code, name: c.name, pct: 0 };
        currMap[key].pct += c.pct * w;
      });
    }

    // Sectors (some bond / multi-asset ETFs have sectors: null)
    if (profile.sectors && profile.sectors.length > 0) {
      sectorCoveredValue += h.marketValue;
      const sectorWeight = h.marketValue / totalValue;
      profile.sectors.forEach(s => {
        sectorMap[s.name] = (sectorMap[s.name] || 0) + s.pct * sectorWeight;
      });
    }

    // Market type (sviluppati vs emergenti)
    if (profile.marketType && profile.marketType.length > 0) {
      marketTypeCoveredValue += h.marketValue;
      profile.marketType.forEach(mt => {
        marketTypeMap[mt.type] = (marketTypeMap[mt.type] || 0) + mt.pct * w;
      });
    }

    // Geographic areas
    if (profile.area && profile.area.length > 0) {
      profile.area.forEach(a => {
        areaMap[a.name] = (areaMap[a.name] || 0) + a.pct * w;
      });
    }

    // Factor exposures (equity & real-estate only)
    if (profile.factors) {
      factorCoveredValue += h.marketValue;
      Object.keys(factorTotals).forEach(f => {
        if (profile.factors[f] !== undefined) {
          factorTotals[f] += profile.factors[f] * w;
        }
      });
    }
  });

  // Normalise so items sum to 100 within the covered portion
  const coveragePct = totalValue > 0 ? (coveredValue / totalValue) * 100 : 0;
  const sectorCoveragePct = totalValue > 0 ? (sectorCoveredValue / totalValue) * 100 : 0;
  const marketTypeCoveragePct = totalValue > 0 ? (marketTypeCoveredValue / totalValue) * 100 : 0;
  const factorCoveragePct = totalValue > 0 ? (factorCoveredValue / totalValue) * 100 : 0;

  const geoScale    = coveragePct > 0 ? 100 / coveragePct : 1;
  const currScale   = coveragePct > 0 ? 100 / coveragePct : 1;
  const sectorScale = sectorCoveragePct > 0 ? 100 / sectorCoveragePct : 1;
  const mtScale     = marketTypeCoveragePct > 0 ? 100 / marketTypeCoveragePct : 1;

  const geography = Object.entries(geoMap)
    .map(([country, pct]) => ({ country, pct: Math.round(pct * geoScale * 10) / 10 }))
    .sort((a, b) => b.pct - a.pct);

  const currencies = Object.values(currMap)
    .map(c => ({ ...c, pct: Math.round(c.pct * currScale * 10) / 10 }))
    .sort((a, b) => b.pct - a.pct);

  const sectors = Object.entries(sectorMap)
    .map(([name, pct]) => ({ name, pct: Math.round(pct * sectorScale * 10) / 10 }))
    .sort((a, b) => b.pct - a.pct);

  const marketType = Object.entries(marketTypeMap)
    .map(([type, pct]) => ({ type, pct: Math.round(pct * mtScale * 10) / 10 }))
    .sort((a, b) => b.pct - a.pct);

  const area = Object.entries(areaMap)
    .map(([name, pct]) => ({ name, pct: Math.round(pct * geoScale * 10) / 10 }))
    .sort((a, b) => b.pct - a.pct);

  // Normalise factors by factor-covered weight (not total)
  const factorScale = factorCoveredValue > 0 ? totalValue / factorCoveredValue : 1;
  const factors = {};
  Object.keys(factorTotals).forEach(f => {
    factors[f] = Math.round(factorTotals[f] * factorScale * 100) / 100;
  });

  return {
    geography,
    currencies,
    sectors,
    marketType,
    area,
    factors,
    coveragePct: Math.round(coveragePct * 10) / 10,
    sectorCoveragePct: Math.round(sectorCoveragePct * 10) / 10,
    marketTypeCoveragePct: Math.round(marketTypeCoveragePct * 10) / 10,
    factorCoveragePct: Math.round(factorCoveragePct * 10) / 10,
    uncovered,
  };
}

/**
 * Aggregate top holdings across all ETF positions weighted by portfolio weight.
 * Returns a ranked list of underlying stocks with blended portfolio weight.
 *
 * @param {Array} holdings  - [{ticker, marketValue, name, ...}]
 * @returns {Array} [{name, pct}]
 */
export function aggregateTopHoldings(holdings) {
  const nonCash = holdings.filter(h => !h.isCash && h.marketValue > 0);
  const totalValue = nonCash.reduce((s, h) => s + h.marketValue, 0);
  if (totalValue === 0) return [];

  const stockMap = {};

  nonCash.forEach(h => {
    const profile = getCompositionProfile(h.ticker);
    const w = h.marketValue / totalValue;

    if (!profile || (!profile.topHoldings && !profile._isDirectStock)) {
      // No profile at all → treat as a direct equity holding (full weight, not split)
      const name = h.name || h.ticker;
      stockMap[name] = (stockMap[name] || 0) + w * 100;
      return;
    }

    if (profile._isDirectStock || !profile.topHoldings) {
      // Known direct stock (has factor profile but no ETF top-holdings)
      const name = h.name || h.ticker;
      stockMap[name] = (stockMap[name] || 0) + w * 100;
      return;
    }

    // ETF: spread its top-holdings across their proportional weight
    profile.topHoldings.forEach(holding => {
      stockMap[holding.name] = (stockMap[holding.name] || 0) + (holding.pct / 100) * w * 100;
    });
  });

  return Object.entries(stockMap)
    .map(([name, pct]) => ({ name, pct: Math.round(pct * 100) / 100 }))
    .sort((a, b) => b.pct - a.pct);
}

/**
 * Reference ACWI market allocation for gap analysis.
 * Source: MSCI ACWI / FTSE All-World approximate weights 2025.
 */
export const ACWI_REFERENCE = {
  area: [
    { name: 'Nord America',       pct: 65.0 },
    { name: 'Europa',             pct: 14.0 },
    { name: 'Giappone',           pct: 5.0  },
    { name: 'Asia Pacifico',      pct: 4.0  },
    { name: 'Asia Emergente',     pct: 8.0  },
    { name: 'Mercati Emergenti',  pct: 8.0  },
    { name: 'America Latina',     pct: 1.5  },
    { name: 'EMEA Emergente',     pct: 1.5  },
  ],
  marketType: [
    { type: 'Mercati sviluppati', pct: 90.0 },
    { type: 'Mercati emergenti',  pct: 10.0 },
  ],
};

/**
 * MSCI World sector weights (reference benchmark per analisi settoriale).
 * Fonte: MSCI, aprile 2026.
 */
export const MSCI_WORLD_SECTORS_REFERENCE = [
  { name: 'Tecnologia',             pct: 25.3 },
  { name: 'Finanza',                pct: 15.8 },
  { name: 'Sanità',                 pct: 12.1 },
  { name: 'Industria',              pct: 10.8 },
  { name: 'Consumi discrezionali',  pct: 10.5 },
  { name: 'Comunicazione',          pct: 8.8  },
  { name: 'Beni di consumo',        pct: 6.2  },
  { name: 'Energia',                pct: 4.1  },
  { name: 'Materiali',              pct: 3.5  },
  { name: 'Utility',                pct: 2.9  },
  { name: 'Immobiliare',            pct: 2.1  },
];

// ── ISIN mapping per JustETF holdings auto-fetch ──────────────────────────────
// Fonte: JustETF / provider ETF (maggio 2026)
// Aggiungere qui i ticker presenti in portafoglio con il loro ISIN.
export const TICKER_ISIN_MAP = {
  // iShares Factor ETFs (Deutsche Börse / Borsa Italiana)
  'XDEM.MI':  'IE00BL25JN58',   // iShares Edge MSCI World Momentum Factor
  'XDEM.DE':  'IE00BL25JN58',
  'XDEQ.MI':  'IE00BL25JP72',   // iShares Edge MSCI World Quality Factor
  'XDEQ.DE':  'IE00BL25JP72',

  // SPDR S&P QMAX / Factor ETFs (State Street)
  'ZPRV.MI':  'IE00BSPLC298',   // SPDR MSCI USA Small Cap Value Weighted
  'ZPRV.DE':  'IE00BSPLC298',
  'ZPRX.MI':  'IE00BSPLC413',   // SPDR MSCI Europe Small Cap Value Weighted
  'ZPRX.DE':  'IE00BSPLC413',

  // Vanguard
  'VWCE.DE':  'IE00BK5BQT80',   // Vanguard FTSE All-World Acc
  'VWCE.MI':  'IE00BK5BQT80',
  'VHYL.MI':  'IE00B8GKDB10',   // Vanguard FTSE All-World High Dividend Yield
  'VHYL.DE':  'IE00B8GKDB10',

  // iShares Core
  'SWDA.MI':  'IE00B4L5Y983',   // iShares Core MSCI World
  'SWDA.L':   'IE00B4L5Y983',
  'IS3N.DE':  'IE00BKM4GZ66',   // iShares Core MSCI EM IMI
  'IS3N.MI':  'IE00BKM4GZ66',

  // SPDR
  'SPPW.DE':  'IE00BFY0GT14',   // SPDR MSCI World UCITS ETF
  'SPYD.MI':  'IE00B6YX5D40',   // SPDR S&P US Dividend Aristocrats
  'SPYD.DE':  'IE00B6YX5D40',

  // iShares NASDAQ-100
  'CNDX.MI':  'IE00B53SZB19',   // iShares NASDAQ-100 UCITS ETF
  'CNDX.L':   'IE00B53SZB19',
  'EQQQ.MI':  'IE00B53SZB19',

  // MSCI Europe
  'EUNY.MI':  'IE00B4K48X80',   // Lyxor Core MSCI Europe
  'VEUR.MI':  'IE00B945VV12',   // Vanguard FTSE Developed Europe

  // MSCI EM
  'EMIM.MI':  'IE00BKM4GZ66',   // iShares Core MSCI EM IMI (alias)
  'VFEM.MI':  'IE0031786142',   // Vanguard FTSE EM

  // MSCI Japan
  'VJPN.MI':  'IE00B50MZ724',   // Vanguard FTSE Japan

  // S&P 500
  'VUAA.MI':  'IE00B3XXRP09',   // Vanguard S&P 500

  // World Small Cap
  'WSML.MI':  'IE00BSPLC413',   // iShares MSCI World Small Cap (placeholder — check ISIN)
  'IUSN.DE':  'IE00BF4RFH31',   // iShares MSCI World Small Cap

  // Dividend Europe
  'IDVY.MI':  'IE00B0M62Q58',   // iShares Euro Dividend

  // Real Estate
  'IWDP.MI':  'IE00B1FZS350',   // iShares Developed Markets Property Yield
};

/**
 * Resolve the canonical ISIN for a given ticker.
 * Returns null if not in the map.
 * @param {string} ticker
 * @returns {string|null}
 */
export function getIsinForTicker(ticker) {
  if (!ticker) return null;
  return TICKER_ISIN_MAP[ticker.toUpperCase()] ?? TICKER_ISIN_MAP[ticker] ?? null;
}

// ── TER (Total Expense Ratio) per profilo ─────────────────────────────────────
// Fonte: JustETF.com → pagina ETF → "Costo totale annuo (TER)"
// Aggiornati: maggio 2026. Verificare annualmente su JustETF o sui siti dei provider.
// Provider principali: iShares (blackrock.com), Vanguard (vanguard.it), SPDR (ssga.com),
//   Amundi/Lyxor (amundietf.com), Xtrackers (dws.com).
//
// Come trovare il TER di un ETF:
//   1. Vai su justetf.com/it → cerca il ticker/nome → scheda ETF → sezione "Costi"
//   2. Oppure: nome-ETF.com (es. vanguard.it, ishares.com) → "Dettagli prodotto"
//
export const TER_BY_PROFILE = {
  // ── Azionario globale ─────────────────────────────────────────────────────
  msci_world:           0.2,   // iShares SWDA, Xtrackers XDWD — più economici 0.12% (SPPW), media ~0.20%
  ftse_all_world:       0.22,   // Vanguard VWCE
  sp500:                0.07,   // Vanguard VUAA / iShares CSPX più economici
  nasdaq100:            0.09,   // iShares CNDX / EQQQ
  msci_europe:          0.12,   // Amundi/Lyxor EUNY, Vanguard VEUR ~0.12%
  euro_stoxx50:         0.10,   // iShares EXW1, Xtrackers SXRJ
  msci_japan:           0.15,   // iShares IJPA
  msci_pacific_exjp:   0.20,   // iShares IASP
  msci_world_sc:        0.35,   // iShares WSML / IUSN

  msci_acwi:            0.17,   // iShares ISAC / Amundi ACWI.MI
  // ── Mercati emergenti ─────────────────────────────────────────────────────
  msci_em:              0.18,   // iShares IS3N
  msci_em_ex_china:     0.20,   // Amundi EMXC.MI
  msci_china:           0.30,   // Amundi/Lyxor LCCN.MI

  // ── Factor ETF ────────────────────────────────────────────────────────────
  msci_world_momentum:  0.30,   // iShares XDEM
  msci_world_quality:   0.30,   // iShares XDEQ
  msci_usa_sc_value:    0.30,   // SPDR ZPRV
  msci_europe_sc_value: 0.30,   // SPDR ZPRX

  // ── Dividendi ─────────────────────────────────────────────────────────────
  dividend_global:      0.29,   // Vanguard VHYL
  dividend_europe:      0.30,   // iShares IDVY
  sp500_high_div:       0.35,   // SPDR SPYD

  // ── Obbligazioni ─────────────────────────────────────────────────────────
  global_agg_bond:      0.10,   // iShares AGGH / Vanguard VAGF
  euro_gov_bond:        0.09,   // iShares IBTS, Vanguard VETY
  euro_corp_bond:       0.12,   // iShares EUNA, Vanguard VCBO
  vanguard_eur_corp:    0.09,   // Vanguard VECA.MI
  eur_infl_linked:      0.09,   // Lyxor/Amundi EMI.MI
  usd_treasury:         0.07,   // iShares DTLA / IBTM / CSBGU7.MI
  usd_treasury_long:    0.10,   // iShares IDTL
  usd_corp_bond:        0.09,   // iShares LQDA
  em_bond_hard:         0.45,   // iShares SEML

  // ── Monetario / Liquidità ─────────────────────────────────────────────────
  overnight_eur:        0.10,   // Xtrackers XEON / Lyxor CSH2
  ultra_short_eur:      0.09,   // iShares IBGS

  // ── Real Estate ───────────────────────────────────────────────────────────
  epra_nareit_dev:      0.14,   // iShares IWDP

  // ── Materie prime / Oro ───────────────────────────────────────────────────
  physical_gold:        0.12,   // iShares SGLN / Invesco SGLD
  bloomberg_commodity:  0.19,   // iShares CMOD

  // ── Crypto ────────────────────────────────────────────────────────────────
  bitcoin_spot:         0.25,   // ETC Group BTCE (varia per provider)
  ethereum_spot:        0.49,   // Spectrum ZETH (varia)

  // ── Multi-asset (LifeStrategy) ────────────────────────────────────────────
  lifestrategy_20:      0.25,   // Vanguard V20A
  lifestrategy_80:      0.25,   // Vanguard V80A

  // ── Nuovi ETF — espansione maggio 2026 ────────────────────────────────────
  stoxx_europe_600:       0.20,  // iShares EXSA.DE / Xtrackers XSSX — varia 0.07%–0.20%
  msci_world_min_vol:     0.30,  // iShares MVOL — media ~0.30%
  msci_world_value:       0.30,  // iShares IWVL — ~0.30%
  msci_world_esg:         0.20,  // iShares SUSW / SUWO — ~0.20%
  msci_india:             0.65,  // iShares NDIA / Xtrackers IN9 — ~0.65%
  clean_energy:           0.65,  // iShares INRG — ~0.65%
  automation_robotics:    0.40,  // iShares RBOT / Xtrackers XAIX — ~0.40%
  silver_spot:            0.20,  // Invesco PHSP / WisdomTree PHAG — ~0.20%
  ftse_mib:               0.33,  // iShares IMIB — ~0.33%
  em_latin_america:       0.65,  // iShares LTAM — ~0.65%
  btp_italy:              0.09,  // iShares Italy Gov Bond — ~0.09%
  msci_world_multifactor: 0.25,  // JPMorgan JPGL — ~0.25%

  // ── Singole azioni → TER = 0 (nessuna commissione di gestione) ───────────
  us_stock_tech:          0,
  us_stock_finance:       0,
  us_stock_health:        0,
  us_stock_consumer_disc: 0,
  us_stock_reit:          0,
  us_stock_comm:          0,
  us_stock_energy:        0,
  us_stock_consumer_staples: 0,
  us_stock_utility:       0,
  us_stock_materials:     0,
  us_stock_industrial:    0,
  uk_stock_consumer_disc: 0,
  uk_stock_energy_gbp:    0,
  uk_stock_finance_gbp:   0,
  uk_stock_health_gbp:    0,
  uk_stock_materials_gbp: 0,
  uk_stock_comm_gbp:      0,

  // ── Nuovi ETF tematici — giugno 2026 ──────────────────────────────────────
  global_healthcare:       0.45,  // iShares HEAL / Xtrackers DHCA — ~0.45%
  cybersecurity:           0.50,  // iShares HACK / L&G ISPY — ~0.50%
  water_global:            0.60,  // iShares IQQQ — ~0.60%
  semiconductors:          0.35,  // iShares SEMI / VanEck SMH — ~0.35%
  dividend_aristocrats:    0.35,  // SPDR NOBL / WisdomTree WQDV — ~0.35%
  msci_europe_value:       0.25,  // iShares IEEV — ~0.25%
  high_yield_eur:          0.50,  // iShares IHYG — ~0.50%
  usd_high_yield:          0.15,  // iShares HYG — ~0.15%
  short_duration_eur:      0.09,  // iShares IBCX — ~0.09%
  msci_world_equal_weight: 0.25,  // Xtrackers EWLD — ~0.25%

  // ── Nuovi ETF — espansione giugno 2026 ────────────────────────────────────
  em_local_currency_bond: 0.50,  // iShares SEML / SPDR SPFJ — ~0.50%
  gold_miners:            0.55,  // VanEck GDX / iShares RING — ~0.50-0.65%
  aerospace_defense:      0.55,  // Invesco DFND / VanEck AERO — ~0.55%
  megatrends_global:      0.45,  // WisdomTree METU / iShares ETLT — ~0.45%
  msci_europe_sc:         0.58,  // iShares IUSP / SPDR SMEA — ~0.58%
  global_infrastructure:  0.65,  // iShares INFR / Xtrackers NFRA — ~0.65%
  msci_em_asia:           0.65,  // iShares XMAS / SPDR PAASI — ~0.65%
  us_short_treasury:      0.07,  // iShares IBTS — ~0.07%
  msci_world_tech:        0.35,  // iShares QDVE / WisdomTree WTCH — ~0.35%
  climate_transition:     0.20,  // iShares PAWD / Xtrackers WOSC — ~0.20%
  eur_short_gov:          0.07,  // iShares IS4S / Lyxor EUBB — ~0.07%

  // ── ETF virali — luglio 2026 (AI, Uranio, Space, Difesa EU…) ─────────────
  artificial_intelligence: 0.65, // WisdomTree WTAI / Xtrackers XAIX — ~0.60–0.68%
  uranium_nuclear:          0.69, // Global X URA / Sprott URNM — ~0.60–0.75%
  space_economy:            0.75, // ARK ARKX / Procure UFO — ~0.70–0.80%
  european_defense:         0.55, // VanEck NATO / HANetf EUAD — ~0.49–0.59%
  copper_miners:            0.65, // Global X COPX / iShares CPRM — ~0.65%
  lithium_battery:          0.75, // Global X LIT / Amplify BATT — ~0.75%
  biotech:                  0.47, // iShares IBB / SPDR XBI — ~0.44–0.50%
  solar_energy:             0.69, // Invesco TAN / HANetf RAYS — ~0.65–0.75%
};

/**
 * Restituisce il TER (in %) per un dato ticker.
 * Singole azioni → 0. ETF non mappati → null (sconosciuto).
 * @param {string} ticker
 * @returns {number|null}
 */
export function getTerForTicker(ticker) {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  const profileName = TICKER_PROFILE[t] ?? TICKER_PROFILE[ticker];
  if (!profileName) return null;
  const profile = PROFILES[profileName];
  if (!profile) return null;
  // Direct stocks always have TER 0
  if (profile._isDirectStock) return 0;
  return TER_BY_PROFILE[profileName] ?? null;
}

/**
 * Restituisce il database grezzo per la generazione del Gist remoto.
 * Usato solo dallo script scripts/update-gist.mjs — non usare nel codice UI.
 * @internal
 */
export function _getRawDatabase() {
  // Costruisce ter: { ticker → number } per il formato remoto
  const ter = {};
  for (const [ticker, profileKey] of Object.entries(TICKER_PROFILE)) {
    const t = TER_BY_PROFILE[profileKey];
    if (t != null) ter[ticker] = t;
  }
  return {
    profiles:            PROFILES,
    tickers:             TICKER_PROFILE,
    commonStockFactors:  COMMON_STOCK_FACTORS,
    ter,
  };
}
