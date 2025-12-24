'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, type Transaction, type Holding } from '@/lib/supabase';

export interface TransactionWithDetails extends Transaction {
  ticker?: string;
  name?: string;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('[Transactions] Supabase not configured');
        setTransactions([]);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('transactions')
        .select('*, holdings(ticker, name)')
        .order('date', { ascending: false });

      if (dbError) {
        console.warn('Supabase error:', dbError.message);
        setError(dbError.message);
      } else {
        // Flatten the holdings data
        const flattenedData = (data || []).map((t: any) => ({
          ...t,
          ticker: t.holdings?.ticker,
          name: t.holdings?.name,
        }));
        setTransactions(flattenedData);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a transaction and auto-update holdings
  const addTransaction = async (transaction: {
    ticker: string;
    name: string;
    isin?: string;
    type: 'BUY' | 'SELL' | 'DIVIDEND';
    shares: number;
    price: number;
    fees: number;
    date: string;
    notes?: string;
    asset_class?: string;
    region?: string;
  }) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { ticker, name, isin, type, shares, price, fees, date, notes, asset_class, region } = transaction;
    const total = shares * price + fees;

    // 1. Check if holding already exists
    const { data: existingHolding } = await supabase
      .from('holdings')
      .select('*')
      .eq('ticker', ticker)
      .single();

    let holdingId: string;

    if (existingHolding) {
      // 2a. Update existing holding
      holdingId = existingHolding.id;

      if (type === 'BUY') {
        // Calculate new average price
        const currentTotalCost = existingHolding.shares * existingHolding.avg_price;
        const newTotalCost = currentTotalCost + (shares * price);
        const newTotalShares = existingHolding.shares + shares;
        const newAvgPrice = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;

        await supabase
          .from('holdings')
          .update({
            shares: newTotalShares,
            avg_price: newAvgPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', holdingId);
      } else if (type === 'SELL') {
        // Reduce shares (avg_price stays the same)
        const newShares = existingHolding.shares - shares;

        if (newShares < 0) {
          throw new Error('Cannot sell more shares than owned');
        }

        await supabase
          .from('holdings')
          .update({
            shares: newShares,
            updated_at: new Date().toISOString(),
          })
          .eq('id', holdingId);
      }
      // DIVIDEND doesn't affect shares or avg_price
    } else {
      // 2b. Create new holding (only for BUY)
      if (type !== 'BUY') {
        throw new Error('Cannot sell or receive dividend on non-existing holding');
      }

      const { data: newHolding, error: holdingError } = await supabase
        .from('holdings')
        .insert([{
          ticker,
          name,
          isin: isin || '',
          shares,
          avg_price: price,
          asset_class: asset_class || 'equity',
          region: region || 'Global',
          purchase_date: date,
        }])
        .select()
        .single();

      if (holdingError) throw holdingError;
      holdingId = newHolding.id;
    }

    // 3. Create the transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        holding_id: holdingId,
        type,
        shares,
        price,
        total,
        fees,
        date,
        notes,
      }]);

    if (transactionError) throw transactionError;

    await fetchTransactions();
  };

  // Delete a transaction (and reverse its effect on holdings)
  const deleteTransaction = async (id: string) => {
    if (!supabase) throw new Error('Supabase not configured');

    // Get the transaction first
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*, holdings(*)')
      .eq('id', id)
      .single();

    if (!transaction) throw new Error('Transaction not found');

    // Reverse the effect on holdings
    const holding = transaction.holdings;
    if (holding) {
      if (transaction.type === 'BUY') {
        // Reverse: subtract shares, recalculate avg_price
        const newShares = holding.shares - transaction.shares;
        // Note: Recalculating avg_price after removing a BUY is complex
        // For simplicity, we'll just update shares for now
        await supabase
          .from('holdings')
          .update({
            shares: newShares,
            updated_at: new Date().toISOString(),
          })
          .eq('id', holding.id);
      } else if (transaction.type === 'SELL') {
        // Reverse: add back shares
        await supabase
          .from('holdings')
          .update({
            shares: holding.shares + transaction.shares,
            updated_at: new Date().toISOString(),
          })
          .eq('id', holding.id);
      }
    }

    // Delete the transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchTransactions();
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Calculate totals
  const totals = {
    buys: transactions.filter(t => t.type === 'BUY').reduce((sum, t) => sum + t.total, 0),
    sells: transactions.filter(t => t.type === 'SELL').reduce((sum, t) => sum + t.total, 0),
    dividends: transactions.filter(t => t.type === 'DIVIDEND').reduce((sum, t) => sum + t.total, 0),
    fees: transactions.reduce((sum, t) => sum + (t.fees || 0), 0),
  };

  return {
    transactions,
    loading,
    error,
    totals,
    refetch: fetchTransactions,
    addTransaction,
    deleteTransaction,
  };
}
