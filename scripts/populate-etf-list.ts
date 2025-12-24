/**
 * Script to populate the etf_list table with popular ETFs
 *
 * Run with: npx ts-node scripts/populate-etf-list.ts
 * Or: npx tsx scripts/populate-etf-list.ts
 *
 * This creates a local database of ETFs for zero-API-call autocomplete
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface ETF {
  code: string;
  exchange: string;
  name: string;
  isin: string;
  type: string;
  currency: string;
  asset_class: string;
  region: string;
  provider: string;
  ter?: number;
  distribution: string;
  replication: string;
}

// Comprehensive list of popular ETFs
// Sources: justETF, Borsa Italiana, Xetra
const ETF_LIST: ETF[] = [
  // ============================================
  // GLOBAL EQUITY - World / All-World
  // ============================================
  { code: 'VWCE', exchange: 'XETRA', name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating', isin: 'IE00BK5BQT80', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0022, distribution: 'ACC', replication: 'Physical' },
  { code: 'VWCE', exchange: 'MI', name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating', isin: 'IE00BK5BQT80', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0022, distribution: 'ACC', replication: 'Physical' },
  { code: 'VWRL', exchange: 'XETRA', name: 'Vanguard FTSE All-World UCITS ETF (USD) Distributing', isin: 'IE00B3RBWM25', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0022, distribution: 'DIST', replication: 'Physical' },
  { code: 'VWRL', exchange: 'MI', name: 'Vanguard FTSE All-World UCITS ETF (USD) Distributing', isin: 'IE00B3RBWM25', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0022, distribution: 'DIST', replication: 'Physical' },
  { code: 'IWDA', exchange: 'XETRA', name: 'iShares Core MSCI World UCITS ETF USD (Acc)', isin: 'IE00B4L5Y983', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Developed', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'IWDA', exchange: 'MI', name: 'iShares Core MSCI World UCITS ETF USD (Acc)', isin: 'IE00B4L5Y983', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Developed', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'SWDA', exchange: 'XETRA', name: 'iShares Core MSCI World UCITS ETF USD (Acc)', isin: 'IE00B4L5Y983', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Developed', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'SWDA', exchange: 'LSE', name: 'iShares Core MSCI World UCITS ETF USD (Acc)', isin: 'IE00B4L5Y983', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Developed', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'ACWI', exchange: 'XETRA', name: 'iShares MSCI ACWI UCITS ETF USD (Acc)', isin: 'IE00B6R52259', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'ACWI', exchange: 'MI', name: 'iShares MSCI ACWI UCITS ETF USD (Acc)', isin: 'IE00B6R52259', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // USA EQUITY
  // ============================================
  { code: 'CSPX', exchange: 'XETRA', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', isin: 'IE00B5BMR087', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'CSPX', exchange: 'MI', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', isin: 'IE00B5BMR087', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'CSPX', exchange: 'LSE', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', isin: 'IE00B5BMR087', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'SXR8', exchange: 'XETRA', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', isin: 'IE00B5BMR087', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'VUAA', exchange: 'XETRA', name: 'Vanguard S&P 500 UCITS ETF (USD) Accumulating', isin: 'IE00BFMXXD54', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Vanguard', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'VUAA', exchange: 'MI', name: 'Vanguard S&P 500 UCITS ETF (USD) Accumulating', isin: 'IE00BFMXXD54', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Vanguard', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'VUSA', exchange: 'XETRA', name: 'Vanguard S&P 500 UCITS ETF (USD) Distributing', isin: 'IE00B3XXRP09', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Vanguard', ter: 0.0007, distribution: 'DIST', replication: 'Physical' },
  { code: 'VUSA', exchange: 'MI', name: 'Vanguard S&P 500 UCITS ETF (USD) Distributing', isin: 'IE00B3XXRP09', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Vanguard', ter: 0.0007, distribution: 'DIST', replication: 'Physical' },
  { code: 'EQQQ', exchange: 'XETRA', name: 'Invesco EQQQ Nasdaq-100 UCITS ETF', isin: 'IE0032077012', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Invesco', ter: 0.0030, distribution: 'DIST', replication: 'Physical' },
  { code: 'EQQQ', exchange: 'MI', name: 'Invesco EQQQ Nasdaq-100 UCITS ETF', isin: 'IE0032077012', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Invesco', ter: 0.0030, distribution: 'DIST', replication: 'Physical' },
  { code: 'SXRV', exchange: 'XETRA', name: 'iShares Nasdaq 100 UCITS ETF (Acc)', isin: 'IE00B53SZB19', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0033, distribution: 'ACC', replication: 'Physical' },
  { code: 'CSNDX', exchange: 'XETRA', name: 'iShares Nasdaq 100 UCITS ETF USD (Acc)', isin: 'IE00B53SZB19', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0033, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // EUROPE EQUITY
  // ============================================
  { code: 'MEUD', exchange: 'XETRA', name: 'Amundi MSCI Europe UCITS ETF Acc', isin: 'LU1681042609', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'Amundi', ter: 0.0015, distribution: 'ACC', replication: 'Synthetic' },
  { code: 'MEUD', exchange: 'MI', name: 'Amundi MSCI Europe UCITS ETF Acc', isin: 'LU1681042609', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'Amundi', ter: 0.0015, distribution: 'ACC', replication: 'Synthetic' },
  { code: 'VEUR', exchange: 'XETRA', name: 'Vanguard FTSE Developed Europe UCITS ETF (EUR) Distributing', isin: 'IE00B945VV12', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'Vanguard', ter: 0.0010, distribution: 'DIST', replication: 'Physical' },
  { code: 'VEUR', exchange: 'MI', name: 'Vanguard FTSE Developed Europe UCITS ETF (EUR) Distributing', isin: 'IE00B945VV12', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'Vanguard', ter: 0.0010, distribution: 'DIST', replication: 'Physical' },
  { code: 'SMEA', exchange: 'XETRA', name: 'iShares Core MSCI Europe UCITS ETF EUR (Acc)', isin: 'IE00B4K48X80', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'iShares', ter: 0.0012, distribution: 'ACC', replication: 'Physical' },
  { code: 'SMEA', exchange: 'MI', name: 'iShares Core MSCI Europe UCITS ETF EUR (Acc)', isin: 'IE00B4K48X80', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'iShares', ter: 0.0012, distribution: 'ACC', replication: 'Physical' },
  { code: 'EXSA', exchange: 'XETRA', name: 'iShares STOXX Europe 600 UCITS ETF (DE)', isin: 'DE0002635307', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'iShares', ter: 0.0020, distribution: 'DIST', replication: 'Physical' },
  { code: 'SX5EEX', exchange: 'XETRA', name: 'iShares Core EURO STOXX 50 UCITS ETF EUR (Acc)', isin: 'IE00B53L3W79', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Eurozone', provider: 'iShares', ter: 0.0010, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // EMERGING MARKETS
  // ============================================
  { code: 'EIMI', exchange: 'XETRA', name: 'iShares Core MSCI EM IMI UCITS ETF USD (Acc)', isin: 'IE00BKM4GZ66', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Emerging', provider: 'iShares', ter: 0.0018, distribution: 'ACC', replication: 'Physical' },
  { code: 'EIMI', exchange: 'MI', name: 'iShares Core MSCI EM IMI UCITS ETF USD (Acc)', isin: 'IE00BKM4GZ66', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Emerging', provider: 'iShares', ter: 0.0018, distribution: 'ACC', replication: 'Physical' },
  { code: 'EIMI', exchange: 'LSE', name: 'iShares Core MSCI EM IMI UCITS ETF USD (Acc)', isin: 'IE00BKM4GZ66', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Emerging', provider: 'iShares', ter: 0.0018, distribution: 'ACC', replication: 'Physical' },
  { code: 'VFEM', exchange: 'XETRA', name: 'Vanguard FTSE Emerging Markets UCITS ETF (USD) Distributing', isin: 'IE00B3VVMM84', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Emerging', provider: 'Vanguard', ter: 0.0022, distribution: 'DIST', replication: 'Physical' },
  { code: 'VFEM', exchange: 'MI', name: 'Vanguard FTSE Emerging Markets UCITS ETF (USD) Distributing', isin: 'IE00B3VVMM84', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Emerging', provider: 'Vanguard', ter: 0.0022, distribution: 'DIST', replication: 'Physical' },
  { code: 'IEEM', exchange: 'XETRA', name: 'iShares MSCI EM UCITS ETF USD (Dist)', isin: 'IE00B0M63177', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Emerging', provider: 'iShares', ter: 0.0018, distribution: 'DIST', replication: 'Physical' },
  { code: 'AEEM', exchange: 'XETRA', name: 'Amundi MSCI Emerging Markets UCITS ETF Acc', isin: 'LU1681045370', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Emerging', provider: 'Amundi', ter: 0.0020, distribution: 'ACC', replication: 'Synthetic' },

  // ============================================
  // JAPAN
  // ============================================
  { code: 'SJPA', exchange: 'XETRA', name: 'iShares Core MSCI Japan IMI UCITS ETF USD (Acc)', isin: 'IE00B4L5YX21', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Japan', provider: 'iShares', ter: 0.0015, distribution: 'ACC', replication: 'Physical' },
  { code: 'VJPN', exchange: 'XETRA', name: 'Vanguard FTSE Japan UCITS ETF (USD) Distributing', isin: 'IE00B95PGT31', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Japan', provider: 'Vanguard', ter: 0.0015, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // ASIA PACIFIC
  // ============================================
  { code: 'VAPX', exchange: 'XETRA', name: 'Vanguard FTSE Developed Asia Pacific ex Japan UCITS ETF (USD) Distributing', isin: 'IE00B9F5YL18', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Asia Pacific', provider: 'Vanguard', ter: 0.0015, distribution: 'DIST', replication: 'Physical' },
  { code: 'CPXJ', exchange: 'XETRA', name: 'iShares Core MSCI Pacific ex Japan UCITS ETF USD (Acc)', isin: 'IE00B52MJY50', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Asia Pacific', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // CHINA
  // ============================================
  { code: 'MCHI', exchange: 'XETRA', name: 'iShares MSCI China UCITS ETF USD (Acc)', isin: 'IE00BJ5JPG56', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'China', provider: 'iShares', ter: 0.0040, distribution: 'ACC', replication: 'Physical' },
  { code: 'CNYA', exchange: 'XETRA', name: 'iShares MSCI China A UCITS ETF USD (Acc)', isin: 'IE00BQT3WG13', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'China', provider: 'iShares', ter: 0.0040, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // SMALL CAP
  // ============================================
  { code: 'IUSN', exchange: 'XETRA', name: 'iShares MSCI World Small Cap UCITS ETF USD (Acc)', isin: 'IE00BF4RFH31', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0035, distribution: 'ACC', replication: 'Physical' },
  { code: 'IUSN', exchange: 'MI', name: 'iShares MSCI World Small Cap UCITS ETF USD (Acc)', isin: 'IE00BF4RFH31', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0035, distribution: 'ACC', replication: 'Physical' },
  { code: 'ZPRV', exchange: 'XETRA', name: 'SPDR MSCI USA Small Cap Value Weighted UCITS ETF', isin: 'IE00BSPLC413', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'SPDR', ter: 0.0030, distribution: 'ACC', replication: 'Physical' },
  { code: 'WSML', exchange: 'XETRA', name: 'iShares MSCI World Small Cap UCITS ETF USD (Acc)', isin: 'IE00BF4RFH31', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0035, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // FACTOR / SMART BETA
  // ============================================
  { code: 'IWMO', exchange: 'XETRA', name: 'iShares Edge MSCI World Momentum Factor UCITS ETF USD (Acc)', isin: 'IE00BP3QZ825', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0030, distribution: 'ACC', replication: 'Physical' },
  { code: 'IWVL', exchange: 'XETRA', name: 'iShares Edge MSCI World Value Factor UCITS ETF USD (Acc)', isin: 'IE00BP3QZB59', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0030, distribution: 'ACC', replication: 'Physical' },
  { code: 'IWQU', exchange: 'XETRA', name: 'iShares Edge MSCI World Quality Factor UCITS ETF USD (Acc)', isin: 'IE00BP3QZ601', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0030, distribution: 'ACC', replication: 'Physical' },
  { code: 'IWSZ', exchange: 'XETRA', name: 'iShares Edge MSCI World Size Factor UCITS ETF USD (Acc)', isin: 'IE00BP3QZD73', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0030, distribution: 'ACC', replication: 'Physical' },
  { code: 'MVOL', exchange: 'XETRA', name: 'iShares Edge MSCI World Minimum Volatility UCITS ETF USD (Acc)', isin: 'IE00B8FHGS14', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0030, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // SECTOR - TECHNOLOGY
  // ============================================
  { code: 'IUIT', exchange: 'XETRA', name: 'iShares S&P 500 Information Technology Sector UCITS ETF USD (Acc)', isin: 'IE00B3WJKG14', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0015, distribution: 'ACC', replication: 'Physical' },
  { code: 'WTCH', exchange: 'XETRA', name: 'WisdomTree Artificial Intelligence UCITS ETF USD Acc', isin: 'IE00BDVPNG13', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'WisdomTree', ter: 0.0040, distribution: 'ACC', replication: 'Physical' },
  { code: 'ROBO', exchange: 'XETRA', name: 'iShares Automation & Robotics UCITS ETF USD (Acc)', isin: 'IE00BYZK4552', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0040, distribution: 'ACC', replication: 'Physical' },
  { code: 'XMLD', exchange: 'XETRA', name: 'Invesco EQQQ Nasdaq-100 UCITS ETF', isin: 'IE0032077012', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Invesco', ter: 0.0030, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // SECTOR - HEALTHCARE
  // ============================================
  { code: 'IUHC', exchange: 'XETRA', name: 'iShares S&P 500 Health Care Sector UCITS ETF USD (Acc)', isin: 'IE00B43HR379', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0015, distribution: 'ACC', replication: 'Physical' },
  { code: 'HEAL', exchange: 'XETRA', name: 'iShares Healthcare Innovation UCITS ETF USD (Acc)', isin: 'IE00BYZK4776', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0040, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // SECTOR - FINANCIALS
  // ============================================
  { code: 'IUFS', exchange: 'XETRA', name: 'iShares S&P 500 Financials Sector UCITS ETF USD (Acc)', isin: 'IE00B4JNQZ49', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0015, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // SECTOR - ENERGY / CLEAN ENERGY
  // ============================================
  { code: 'IUES', exchange: 'XETRA', name: 'iShares S&P 500 Energy Sector UCITS ETF USD (Acc)', isin: 'IE00B42NKQ00', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0015, distribution: 'ACC', replication: 'Physical' },
  { code: 'INRG', exchange: 'XETRA', name: 'iShares Global Clean Energy UCITS ETF USD (Dist)', isin: 'IE00B1XNHC34', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0065, distribution: 'DIST', replication: 'Physical' },
  { code: 'INRG', exchange: 'MI', name: 'iShares Global Clean Energy UCITS ETF USD (Dist)', isin: 'IE00B1XNHC34', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0065, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // ESG / SUSTAINABLE
  // ============================================
  { code: 'SUSW', exchange: 'XETRA', name: 'iShares MSCI World SRI UCITS ETF EUR (Acc)', isin: 'IE00BYX2JD69', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'SUSW', exchange: 'MI', name: 'iShares MSCI World SRI UCITS ETF EUR (Acc)', isin: 'IE00BYX2JD69', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'ESGW', exchange: 'XETRA', name: 'UBS ETF MSCI World Socially Responsible UCITS ETF (USD) A-acc', isin: 'IE00BK72HJ67', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'UBS', ter: 0.0022, distribution: 'ACC', replication: 'Physical' },
  { code: 'SUWS', exchange: 'XETRA', name: 'iShares MSCI USA SRI UCITS ETF USD (Acc)', isin: 'IE00BYVJRR92', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // BONDS - AGGREGATE
  // ============================================
  { code: 'AGGH', exchange: 'XETRA', name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)', isin: 'IE00BDBRDM35', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Global', provider: 'iShares', ter: 0.0010, distribution: 'ACC', replication: 'Physical' },
  { code: 'AGGH', exchange: 'MI', name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)', isin: 'IE00BDBRDM35', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Global', provider: 'iShares', ter: 0.0010, distribution: 'ACC', replication: 'Physical' },
  { code: 'AGGH', exchange: 'LSE', name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)', isin: 'IE00BDBRDM35', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Global', provider: 'iShares', ter: 0.0010, distribution: 'ACC', replication: 'Physical' },
  { code: 'EUNA', exchange: 'XETRA', name: 'iShares Core Euro Government Bond UCITS ETF EUR (Dist)', isin: 'IE00B4WXJJ64', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Eurozone', provider: 'iShares', ter: 0.0007, distribution: 'DIST', replication: 'Physical' },
  { code: 'VGEA', exchange: 'XETRA', name: 'Vanguard EUR Eurozone Government Bond UCITS ETF (EUR) Accumulating', isin: 'IE00BH04GL39', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Eurozone', provider: 'Vanguard', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // BONDS - GOVERNMENT
  // ============================================
  { code: 'IBTS', exchange: 'XETRA', name: 'iShares USD Treasury Bond 1-3yr UCITS ETF USD (Acc)', isin: 'IE00BDFK1573', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'USA', provider: 'iShares', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'STHY', exchange: 'XETRA', name: 'iShares EUR Govt Bond 1-3yr UCITS ETF EUR (Acc)', isin: 'IE00B4WXJJ64', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Eurozone', provider: 'iShares', ter: 0.0015, distribution: 'ACC', replication: 'Physical' },
  { code: 'IBCI', exchange: 'XETRA', name: 'iShares Euro Inflation Linked Govt Bond UCITS ETF EUR (Acc)', isin: 'IE00B0M62X26', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Eurozone', provider: 'iShares', ter: 0.0009, distribution: 'ACC', replication: 'Physical' },
  { code: 'TIP', exchange: 'XETRA', name: 'iShares USD TIPS UCITS ETF USD (Acc)', isin: 'IE00B1FZSC47', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'USA', provider: 'iShares', ter: 0.0010, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // BONDS - CORPORATE
  // ============================================
  { code: 'IEAC', exchange: 'XETRA', name: 'iShares Core Euro Corporate Bond UCITS ETF EUR (Dist)', isin: 'IE00B3F81R35', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Europe', provider: 'iShares', ter: 0.0020, distribution: 'DIST', replication: 'Physical' },
  { code: 'IEAC', exchange: 'MI', name: 'iShares Core Euro Corporate Bond UCITS ETF EUR (Dist)', isin: 'IE00B3F81R35', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Europe', provider: 'iShares', ter: 0.0020, distribution: 'DIST', replication: 'Physical' },
  { code: 'LQDE', exchange: 'XETRA', name: 'iShares USD Corp Bond UCITS ETF USD (Dist)', isin: 'IE0032895942', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'USA', provider: 'iShares', ter: 0.0020, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // BONDS - HIGH YIELD
  // ============================================
  { code: 'IHYU', exchange: 'XETRA', name: 'iShares USD High Yield Corp Bond UCITS ETF USD (Dist)', isin: 'IE00B4PY7Y77', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'USA', provider: 'iShares', ter: 0.0050, distribution: 'DIST', replication: 'Physical' },
  { code: 'IHYG', exchange: 'XETRA', name: 'iShares Euro High Yield Corp Bond UCITS ETF EUR (Dist)', isin: 'IE00B66F4759', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Europe', provider: 'iShares', ter: 0.0050, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // BONDS - EMERGING MARKETS
  // ============================================
  { code: 'IEMB', exchange: 'XETRA', name: 'iShares J.P. Morgan USD EM Bond UCITS ETF USD (Dist)', isin: 'IE00B2NPKV68', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Emerging', provider: 'iShares', ter: 0.0045, distribution: 'DIST', replication: 'Physical' },
  { code: 'VEMT', exchange: 'XETRA', name: 'Vanguard USD Emerging Markets Government Bond UCITS ETF (USD) Distributing', isin: 'IE00BZ163L38', type: 'ETF', currency: 'EUR', asset_class: 'bond', region: 'Emerging', provider: 'Vanguard', ter: 0.0025, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // COMMODITIES - GOLD
  // ============================================
  { code: 'SGLD', exchange: 'XETRA', name: 'Invesco Physical Gold ETC', isin: 'IE00B579F325', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'Invesco', ter: 0.0012, distribution: 'ACC', replication: 'Physical' },
  { code: 'SGLD', exchange: 'MI', name: 'Invesco Physical Gold ETC', isin: 'IE00B579F325', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'Invesco', ter: 0.0012, distribution: 'ACC', replication: 'Physical' },
  { code: 'SGLD', exchange: 'LSE', name: 'Invesco Physical Gold ETC', isin: 'IE00B579F325', type: 'ETC', currency: 'USD', asset_class: 'commodity', region: 'Global', provider: 'Invesco', ter: 0.0012, distribution: 'ACC', replication: 'Physical' },
  { code: 'EGLN', exchange: 'XETRA', name: 'iShares Physical Gold ETC', isin: 'IE00B4ND3602', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'iShares', ter: 0.0012, distribution: 'ACC', replication: 'Physical' },
  { code: 'PHAU', exchange: 'XETRA', name: 'WisdomTree Physical Gold', isin: 'JE00B1VS3770', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'WisdomTree', ter: 0.0039, distribution: 'ACC', replication: 'Physical' },
  { code: 'XGLD', exchange: 'XETRA', name: 'Xtrackers Physical Gold ETC (EUR)', isin: 'DE000A1E0HR8', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'Xtrackers', ter: 0.0036, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // COMMODITIES - SILVER
  // ============================================
  { code: 'PHAG', exchange: 'XETRA', name: 'WisdomTree Physical Silver', isin: 'JE00B1VS3333', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'WisdomTree', ter: 0.0049, distribution: 'ACC', replication: 'Physical' },
  { code: 'SSLN', exchange: 'XETRA', name: 'iShares Physical Silver ETC', isin: 'IE00B4NCWG09', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // COMMODITIES - BROAD / DIVERSIFIED
  // ============================================
  { code: 'CMOD', exchange: 'XETRA', name: 'iShares Diversified Commodity Swap UCITS ETF', isin: 'IE00BDFL4P12', type: 'ETF', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'iShares', ter: 0.0019, distribution: 'ACC', replication: 'Synthetic' },
  { code: 'AIGC', exchange: 'XETRA', name: 'WisdomTree Enhanced Commodity UCITS ETF - USD Acc', isin: 'IE00BYMLZY74', type: 'ETF', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'WisdomTree', ter: 0.0035, distribution: 'ACC', replication: 'Synthetic' },

  // ============================================
  // REAL ESTATE
  // ============================================
  { code: 'IWDP', exchange: 'XETRA', name: 'iShares Developed Markets Property Yield UCITS ETF USD (Dist)', isin: 'IE00B1FZS350', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0059, distribution: 'DIST', replication: 'Physical' },
  { code: 'IPRP', exchange: 'XETRA', name: 'iShares European Property Yield UCITS ETF EUR (Dist)', isin: 'IE00B0M63284', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'iShares', ter: 0.0040, distribution: 'DIST', replication: 'Physical' },
  { code: 'VNQI', exchange: 'XETRA', name: 'Vanguard Global ex-U.S. Real Estate ETF', isin: 'US9220428588', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0012, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // CRYPTO
  // ============================================
  { code: 'BTCE', exchange: 'XETRA', name: 'BTCetc - ETC Group Physical Bitcoin', isin: 'DE000A27Z304', type: 'ETC', currency: 'EUR', asset_class: 'crypto', region: 'Global', provider: 'ETC Group', ter: 0.0200, distribution: 'ACC', replication: 'Physical' },
  { code: 'ETHE', exchange: 'XETRA', name: 'ETC Group Physical Ethereum ETC', isin: 'DE000A3GMKD7', type: 'ETC', currency: 'EUR', asset_class: 'crypto', region: 'Global', provider: 'ETC Group', ter: 0.0190, distribution: 'ACC', replication: 'Physical' },
  { code: 'VBTC', exchange: 'XETRA', name: 'VanEck Bitcoin ETN', isin: 'DE000A28M8D0', type: 'ETN', currency: 'EUR', asset_class: 'crypto', region: 'Global', provider: 'VanEck', ter: 0.0100, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // US ETFs (for reference)
  // ============================================
  { code: 'SPY', exchange: 'US', name: 'SPDR S&P 500 ETF Trust', isin: 'US78462F1030', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'USA', provider: 'SPDR', ter: 0.0009, distribution: 'DIST', replication: 'Physical' },
  { code: 'VOO', exchange: 'US', name: 'Vanguard S&P 500 ETF', isin: 'US9229083632', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'USA', provider: 'Vanguard', ter: 0.0003, distribution: 'DIST', replication: 'Physical' },
  { code: 'IVV', exchange: 'US', name: 'iShares Core S&P 500 ETF', isin: 'US4642872000', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0003, distribution: 'DIST', replication: 'Physical' },
  { code: 'VTI', exchange: 'US', name: 'Vanguard Total Stock Market ETF', isin: 'US9229087690', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'USA', provider: 'Vanguard', ter: 0.0003, distribution: 'DIST', replication: 'Physical' },
  { code: 'QQQ', exchange: 'US', name: 'Invesco QQQ Trust', isin: 'US46090E1038', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'USA', provider: 'Invesco', ter: 0.0020, distribution: 'DIST', replication: 'Physical' },
  { code: 'VT', exchange: 'US', name: 'Vanguard Total World Stock ETF', isin: 'US9220427424', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0007, distribution: 'DIST', replication: 'Physical' },
  { code: 'VEA', exchange: 'US', name: 'Vanguard FTSE Developed Markets ETF', isin: 'US9219438580', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Developed', provider: 'Vanguard', ter: 0.0005, distribution: 'DIST', replication: 'Physical' },
  { code: 'VWO', exchange: 'US', name: 'Vanguard FTSE Emerging Markets ETF', isin: 'US9220428588', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Emerging', provider: 'Vanguard', ter: 0.0008, distribution: 'DIST', replication: 'Physical' },
  { code: 'ARKK', exchange: 'US', name: 'ARK Innovation ETF', isin: 'US00214Q1040', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'USA', provider: 'ARK', ter: 0.0075, distribution: 'ACC', replication: 'Physical' },
  { code: 'GLD', exchange: 'US', name: 'SPDR Gold Shares', isin: 'US78463V1070', type: 'ETF', currency: 'USD', asset_class: 'commodity', region: 'Global', provider: 'SPDR', ter: 0.0040, distribution: 'ACC', replication: 'Physical' },
  { code: 'BND', exchange: 'US', name: 'Vanguard Total Bond Market ETF', isin: 'US9219378356', type: 'ETF', currency: 'USD', asset_class: 'bond', region: 'USA', provider: 'Vanguard', ter: 0.0003, distribution: 'DIST', replication: 'Physical' },
  { code: 'AGG', exchange: 'US', name: 'iShares Core U.S. Aggregate Bond ETF', isin: 'US4642872265', type: 'ETF', currency: 'USD', asset_class: 'bond', region: 'USA', provider: 'iShares', ter: 0.0003, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // MONEY MARKET / CASH
  // ============================================
  { code: 'XEON', exchange: 'XETRA', name: 'Xtrackers EUR Overnight Rate Swap UCITS ETF 1C', isin: 'LU0290358497', type: 'ETF', currency: 'EUR', asset_class: 'cash', region: 'Europe', provider: 'Xtrackers', ter: 0.0010, distribution: 'ACC', replication: 'Synthetic' },
  { code: 'CSH2', exchange: 'XETRA', name: 'iShares EUR Ultrashort Bond UCITS ETF', isin: 'IE00BCRY6557', type: 'ETF', currency: 'EUR', asset_class: 'cash', region: 'Europe', provider: 'iShares', ter: 0.0009, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // LEVERAGED (use with caution)
  // ============================================
  { code: '3USL', exchange: 'XETRA', name: 'WisdomTree S&P 500 3x Daily Leveraged', isin: 'IE00B7Y34M31', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'WisdomTree', ter: 0.0075, distribution: 'ACC', replication: 'Synthetic' },
  { code: 'LQQ', exchange: 'XETRA', name: 'Amundi Nasdaq-100 Daily (2x) Leveraged UCITS ETF Acc', isin: 'FR0010342592', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'Amundi', ter: 0.0060, distribution: 'ACC', replication: 'Synthetic' },

  // ============================================
  // DIVIDEND FOCUSED
  // ============================================
  { code: 'VHYL', exchange: 'XETRA', name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF (USD) Distributing', isin: 'IE00B8GKDB10', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0029, distribution: 'DIST', replication: 'Physical' },
  { code: 'VHYL', exchange: 'MI', name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF (USD) Distributing', isin: 'IE00B8GKDB10', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'Vanguard', ter: 0.0029, distribution: 'DIST', replication: 'Physical' },
  { code: 'IDVY', exchange: 'XETRA', name: 'iShares Euro Dividend UCITS ETF EUR (Dist)', isin: 'IE00B0M62S72', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Eurozone', provider: 'iShares', ter: 0.0040, distribution: 'DIST', replication: 'Physical' },
  { code: 'SPYD', exchange: 'XETRA', name: 'SPDR S&P US Dividend Aristocrats UCITS ETF USD (Dist)', isin: 'IE00B6YX5D40', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'SPDR', ter: 0.0035, distribution: 'DIST', replication: 'Physical' },

  // ============================================
  // COUNTRY SPECIFIC
  // ============================================
  { code: 'EXS1', exchange: 'XETRA', name: 'iShares Core DAX UCITS ETF (DE)', isin: 'DE0005933931', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Germany', provider: 'iShares', ter: 0.0016, distribution: 'ACC', replication: 'Physical' },
  { code: 'IFRN', exchange: 'XETRA', name: 'iShares MSCI France UCITS ETF EUR (Acc)', isin: 'IE00BP3QZJ36', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'France', provider: 'iShares', ter: 0.0025, distribution: 'ACC', replication: 'Physical' },
  { code: 'EWI', exchange: 'XETRA', name: 'iShares MSCI Italy UCITS ETF EUR (Acc)', isin: 'IE00B0M62Y33', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Italy', provider: 'iShares', ter: 0.0033, distribution: 'ACC', replication: 'Physical' },
  { code: 'IBTS', exchange: 'XETRA', name: 'iShares MSCI United Kingdom UCITS ETF GBP (Acc)', isin: 'IE00B539F030', type: 'ETF', currency: 'GBP', asset_class: 'equity', region: 'UK', provider: 'iShares', ter: 0.0033, distribution: 'ACC', replication: 'Physical' },
  { code: 'ERUS', exchange: 'XETRA', name: 'iShares MSCI Russia ADR/GDR UCITS ETF USD (Acc)', isin: 'IE00B5V87390', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Russia', provider: 'iShares', ter: 0.0065, distribution: 'ACC', replication: 'Physical' },
  { code: 'IAUS', exchange: 'XETRA', name: 'iShares MSCI Australia UCITS ETF USD (Acc)', isin: 'IE00B5377D42', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Australia', provider: 'iShares', ter: 0.0050, distribution: 'ACC', replication: 'Physical' },
  { code: 'EWZ', exchange: 'US', name: 'iShares MSCI Brazil ETF', isin: 'US4642864007', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'Brazil', provider: 'iShares', ter: 0.0059, distribution: 'DIST', replication: 'Physical' },
  { code: 'INDA', exchange: 'US', name: 'iShares MSCI India ETF', isin: 'US46429B5984', type: 'ETF', currency: 'USD', asset_class: 'equity', region: 'India', provider: 'iShares', ter: 0.0064, distribution: 'ACC', replication: 'Physical' },

  // ============================================
  // MORE ITALIAN EXCHANGE (.MI) VERSIONS
  // ============================================
  { code: 'SWDA', exchange: 'MI', name: 'iShares Core MSCI World UCITS ETF USD (Acc)', isin: 'IE00B4L5Y983', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Developed', provider: 'iShares', ter: 0.0020, distribution: 'ACC', replication: 'Physical' },
  { code: 'SXR8', exchange: 'MI', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', isin: 'IE00B5BMR087', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'USA', provider: 'iShares', ter: 0.0007, distribution: 'ACC', replication: 'Physical' },
  { code: 'EXSA', exchange: 'MI', name: 'iShares STOXX Europe 600 UCITS ETF (DE)', isin: 'DE0002635307', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Europe', provider: 'iShares', ter: 0.0020, distribution: 'DIST', replication: 'Physical' },
  { code: 'IUSN', exchange: 'MI', name: 'iShares MSCI World Small Cap UCITS ETF USD (Acc)', isin: 'IE00BF4RFH31', type: 'ETF', currency: 'EUR', asset_class: 'equity', region: 'Global', provider: 'iShares', ter: 0.0035, distribution: 'ACC', replication: 'Physical' },
  { code: 'EGLN', exchange: 'MI', name: 'iShares Physical Gold ETC', isin: 'IE00B4ND3602', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'iShares', ter: 0.0012, distribution: 'ACC', replication: 'Physical' },
  { code: 'PHAU', exchange: 'MI', name: 'WisdomTree Physical Gold', isin: 'JE00B1VS3770', type: 'ETC', currency: 'EUR', asset_class: 'commodity', region: 'Global', provider: 'WisdomTree', ter: 0.0039, distribution: 'ACC', replication: 'Physical' },
  { code: 'XEON', exchange: 'MI', name: 'Xtrackers EUR Overnight Rate Swap UCITS ETF 1C', isin: 'LU0290358497', type: 'ETF', currency: 'EUR', asset_class: 'cash', region: 'Europe', provider: 'Xtrackers', ter: 0.0010, distribution: 'ACC', replication: 'Synthetic' },
  { code: 'BTCE', exchange: 'MI', name: 'BTCetc - ETC Group Physical Bitcoin', isin: 'DE000A27Z304', type: 'ETC', currency: 'EUR', asset_class: 'crypto', region: 'Global', provider: 'ETC Group', ter: 0.0200, distribution: 'ACC', replication: 'Physical' },
];

async function populateETFList() {
  console.log('🚀 Starting ETF list population...');
  console.log(`📊 Total ETFs to insert: ${ETF_LIST.length}`);

  // Transform data for insertion
  const records = ETF_LIST.map(etf => ({
    ticker: `${etf.code}.${etf.exchange}`,
    code: etf.code,
    exchange: etf.exchange,
    name: etf.name,
    isin: etf.isin,
    type: etf.type,
    currency: etf.currency,
    asset_class: etf.asset_class,
    region: etf.region,
    provider: etf.provider,
    ter: etf.ter,
    distribution: etf.distribution,
    replication: etf.replication,
  }));

  // Insert in batches
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { error } = await supabase
      .from('etf_list')
      .upsert(batch, { onConflict: 'code,exchange' });

    if (error) {
      console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted batch ${i}-${i + batch.length} (${inserted}/${records.length})`);
    }
  }

  console.log('\n📈 Population complete!');
  console.log(`✅ Successfully inserted: ${inserted}`);
  console.log(`❌ Errors: ${errors}`);

  // Verify count
  const { count } = await supabase
    .from('etf_list')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total records in database: ${count}`);
}

// Run if called directly
populateETFList().catch(console.error);

export { ETF_LIST, populateETFList };
