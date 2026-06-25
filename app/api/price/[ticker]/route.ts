import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const symbol = `${ticker.toUpperCase()}.KA`

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 }, // no caching — always fresh
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo Finance returned ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta

    if (!meta || meta.regularMarketPrice == null) {
      return NextResponse.json({ error: 'Price not available for this ticker' }, { status: 404 })
    }

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      symbol,
      price: meta.regularMarketPrice as number,
      currency: meta.currency ?? 'PKR',
      marketState: meta.marketState ?? 'UNKNOWN',
      previousClose: meta.previousClose ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`Failed to fetch price for ${symbol}:`, err)
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
  }
}
