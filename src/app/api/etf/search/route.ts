import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Search ETFs from local database (zero API calls)
 * GET /api/etf/search?q=VWCE
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toUpperCase() || '';

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  try {
    // Search by code, name, or ISIN
    const { data, error } = await supabase
      .from('etf_list')
      .select('*')
      .or(`code.ilike.%${query}%,name.ilike.%${query}%,isin.ilike.%${query}%`)
      .order('code')
      .limit(30);

    if (error) {
      console.error('ETF search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by ISIN to show all exchanges for same ETF
    const grouped = (data || []).reduce((acc: Record<string, any[]>, etf) => {
      const key = etf.isin || etf.ticker;
      if (!acc[key]) acc[key] = [];
      acc[key].push(etf);
      return acc;
    }, {});

    // Format response with exchange info
    const results = (data || []).map(etf => ({
      id: etf.id,
      ticker: etf.ticker,
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
      // Count how many exchanges have this ETF (same ISIN)
      exchanges_count: grouped[etf.isin]?.length || 1,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('ETF search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
