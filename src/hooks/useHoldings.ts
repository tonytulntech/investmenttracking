'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, type Holding } from '@/lib/supabase';
import { getCachedQuote, getApiUsageStats } from '@/lib/eodhd-cached';

export interface HoldingWithPrice extends Holding {
  current_price: number;
  value: number;
  pnl: number;
  pnl_percent: number;
  day_change: number;
  day_change_percent: number;
}

// Mock data for development/demo (when no real holdings exist)
const MOCK_HOLDINGS: HoldingWithPrice[] = [
  {
    id: '1',
    user_id: 'demo',
    ticker: 'VWCE.XETRA',
    name: 'Vanguard FTSE All-World UCITS ETF',
    isin: 'IE00BK5BQT80',
    shares: 45,
    avg_price: 98.50,
    asset_class: 'equity',
    region: 'Global',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_price: 112.30,
    value: 5053.50,
    pnl: 621.00,
    pnl_percent: 14.01,
    day_change: 1.35,
    day_change_percent: 1.2,
  },
  {
    id: '2',
    user_id: 'demo',
    ticker: 'CSPX.LSE',
    name: 'iShares Core S&P 500 UCITS ETF',
    isin: 'IE00B5BMR087',
    shares: 120,
    avg_price: 420.00,
    asset_class: 'equity',
    region: 'USA',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_price: 485.50,
    value: 58260.00,
    pnl: 7860.00,
    pnl_percent: 15.60,
    day_change: 4.12,
    day_change_percent: 0.85,
  },
  {
    id: '3',
    user_id: 'demo',
    ticker: 'IWDA.LSE',
    name: 'iShares Core MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    shares: 200,
    avg_price: 72.00,
    asset_class: 'equity',
    region: 'Developed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_price: 82.45,
    value: 16490.00,
    pnl: 2090.00,
    pnl_percent: 14.51,
    day_change: -0.26,
    day_change_percent: -0.32,
  },
  {
    id: '4',
    user_id: 'demo',
    ticker: 'EIMI.LSE',
    name: 'iShares Core MSCI EM IMI UCITS ETF',
    isin: 'IE00BKM4GZ66',
    shares: 350,
    avg_price: 28.50,
    asset_class: 'equity',
    region: 'Emerging',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_price: 26.80,
    value: 9380.00,
    pnl: -595.00,
    pnl_percent: -5.96,
    day_change: -0.39,
    day_change_percent: -1.45,
  },
  {
    id: '5',
    user_id: 'demo',
    ticker: 'AGGH.LSE',
    name: 'iShares Core Global Aggregate Bond',
    isin: 'IE00BDBRDM35',
    shares: 500,
    avg_price: 4.85,
    asset_class: 'bond',
    region: 'Global',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_price: 4.62,
    value: 2310.00,
    pnl: -115.00,
    pnl_percent: -4.74,
    day_change: 0.01,
    day_change_percent: 0.22,
  },
  {
    id: '6',
    user_id: 'demo',
    ticker: 'SGLD.LSE',
    name: 'Invesco Physical Gold ETC',
    isin: 'IE00B579F325',
    shares: 80,
    avg_price: 165.00,
    asset_class: 'commodity',
    region: 'Global',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_price: 178.50,
    value: 14280.00,
    pnl: 1080.00,
    pnl_percent: 8.18,
    day_change: 1.16,
    day_change_percent: 0.65,
  },
];

export function useHoldings() {
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStats, setApiStats] = useState(getApiUsageStats());

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from Supabase first
      const { data: dbHoldings, error: dbError } = await supabase
        .from('holdings')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.warn('Supabase error:', dbError.message);
      }

      // If no holdings in DB, use mock data for demo
      const baseHoldings = (dbHoldings && dbHoldings.length > 0)
        ? dbHoldings
        : MOCK_HOLDINGS;

      // If using mock data, don't fetch prices from API
      if (!dbHoldings || dbHoldings.length === 0) {
        console.log('[Holdings] Using mock data for demo');
        setHoldings(MOCK_HOLDINGS);
        setLoading(false);
        return;
      }

      // Enrich with current prices from EODHD (cached)
      const enrichedHoldings: HoldingWithPrice[] = await Promise.all(
        baseHoldings.map(async (holding) => {
          const quote = await getCachedQuote(holding.ticker);

          if (quote) {
            const currentPrice = quote.close;
            const value = holding.shares * currentPrice;
            const cost = holding.shares * holding.avg_price;
            const pnl = value - cost;

            return {
              ...holding,
              current_price: currentPrice,
              value,
              pnl,
              pnl_percent: (pnl / cost) * 100,
              day_change: quote.change,
              day_change_percent: quote.change_p,
            };
          }

          // Fallback if no quote available
          return {
            ...holding,
            current_price: holding.avg_price,
            value: holding.shares * holding.avg_price,
            pnl: 0,
            pnl_percent: 0,
            day_change: 0,
            day_change_percent: 0,
          };
        })
      );

      setHoldings(enrichedHoldings);
      setApiStats(getApiUsageStats());
    } catch (err) {
      console.error('Error fetching holdings:', err);
      setError('Failed to load holdings');
      // Fallback to mock data on error
      setHoldings(MOCK_HOLDINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new holding
  const addHolding = async (holding: Omit<Holding, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('holdings')
      .insert([holding])
      .select()
      .single();

    if (error) throw error;

    await fetchHoldings();
    return data;
  };

  // Update a holding
  const updateHolding = async (id: string, updates: Partial<Holding>) => {
    const { error } = await supabase
      .from('holdings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await fetchHoldings();
  };

  // Delete a holding
  const deleteHolding = async (id: string) => {
    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchHoldings();
  };

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Calculate totals
  const totals = {
    value: holdings.reduce((sum, h) => sum + h.value, 0),
    cost: holdings.reduce((sum, h) => sum + (h.shares * h.avg_price), 0),
    pnl: holdings.reduce((sum, h) => sum + h.pnl, 0),
    dayChange: holdings.reduce((sum, h) => sum + (h.day_change * h.shares), 0),
  };

  return {
    holdings,
    loading,
    error,
    totals,
    apiStats,
    refetch: fetchHoldings,
    addHolding,
    updateHolding,
    deleteHolding,
  };
}
