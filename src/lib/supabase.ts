import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (will be expanded as we add tables)
export interface Holding {
  id: string;
  user_id: string;
  ticker: string;
  name: string;
  isin: string;
  shares: number;
  avg_price: number;
  asset_class: 'equity' | 'bond' | 'commodity' | 'crypto' | 'cash';
  region: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  holding_id: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  shares: number;
  price: number;
  total: number;
  fees: number;
  date: string;
  notes?: string;
  created_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
