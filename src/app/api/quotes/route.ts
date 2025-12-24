import { NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_EODHD_API_KEY;
const BASE_URL = 'https://eodhd.com/api';

/**
 * Proxy for EODHD API to avoid CORS issues
 * GET /api/quotes?tickers=VWCE.XETRA,CSPX.MI
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = searchParams.get('tickers');

  if (!tickers) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/real-time/${tickers}?api_token=${API_KEY}&fmt=json`
    );

    if (!response.ok) {
      throw new Error(`EODHD API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
