import { NextResponse } from 'next/server';

// Try server-side env first, then fall back to public
const API_KEY = process.env.EODHD_API_KEY || process.env.NEXT_PUBLIC_EODHD_API_KEY;
const BASE_URL = 'https://eodhd.com/api';

/**
 * Proxy for EODHD API to avoid CORS issues
 * GET /api/quotes?tickers=VWCE.XETRA,CSPX.MI
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = searchParams.get('tickers');

  console.log('[API/quotes] Request for tickers:', tickers);

  if (!tickers) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
  }

  if (!API_KEY) {
    console.error('[API/quotes] No API key found in environment');
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const url = `${BASE_URL}/real-time/${tickers}?api_token=${API_KEY}&fmt=json`;
  console.log('[API/quotes] Fetching:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

  try {
    const response = await fetch(url);

    console.log('[API/quotes] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API/quotes] EODHD error response:', errorText);
      return NextResponse.json({
        error: `EODHD API error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[API/quotes] Success, received data for:', Object.keys(data).length > 0 ? 'valid response' : 'empty');

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API/quotes] Fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch quotes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
