import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const symbol = ticker.toUpperCase()

  // Try 1: stooq.com — provides PSX (Karachi) stocks with .PK suffix, no auth needed
  try {
    const res = await fetch(
      `https://stooq.com/q/l/?s=${symbol.toLowerCase()}.pk&f=sd2t2ohlcvn`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/plain,*/*',
        },
        next: { revalidate: 0 },
      }
    )
    if (res.ok) {
      const text = await res.text()
      // CSV: Symbol,Date,Time,Open,High,Low,Close,Volume,Name
      const lines = text.trim().split('\n')
      if (lines.length >= 2) {
        const cols = lines[1].split(',')
        const close = parseFloat(cols[6])
        const open  = parseFloat(cols[3])
        if (!isNaN(close) && close > 0) {
          const change = close - open
          const changePct = open > 0 ? (change / open) * 100 : 0
          return NextResponse.json({
            ticker: symbol,
            price: close,
            change: parseFloat(change.toFixed(2)),
            changePct: parseFloat(changePct.toFixed(2)),
            volume: parseInt(cols[7]) || null,
            timestamp: new Date().toISOString(),
            source: 'stooq',
          })
        }
      }
    }
  } catch (_e) {}

  const psxHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://dps.psx.com.pk/',
    'Origin': 'https://dps.psx.com.pk',
  }

  // Try 2: PSX individual company endpoint
  try {
    const res = await fetch(`https://dps.psx.com.pk/api/v1/companies/${symbol}`, {
      headers: psxHeaders,
      next: { revalidate: 0 },
    })
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
      const data = await res.json()
      const price = data?.current ?? data?.ldcp ?? data?.close ?? null
      if (price !== null) {
        return NextResponse.json({
          ticker: symbol,
          price: Number(price),
          change: data?.change ?? null,
          changePct: data?.change_p ?? null,
          volume: data?.volume ?? null,
          timestamp: new Date().toISOString(),
          source: 'psx',
        })
      }
    }
  } catch (_e) {}

  // Try 3: PSX companies list
  try {
    const res = await fetch(`https://dps.psx.com.pk/api/v1/companies?symbol=${symbol}`, {
      headers: psxHeaders,
      next: { revalidate: 0 },
    })
    if (res.ok) {
      const data = await res.json()
      const list: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : (data?.data ?? data?.companies ?? [])
      const co = list.find(c => (c.symbol as string)?.toUpperCase() === symbol)
      const price = co?.current ?? co?.ldcp ?? null
      if (price !== null) {
        return NextResponse.json({
          ticker: symbol,
          price: Number(price),
          change: co?.change ?? null,
          changePct: co?.change_p ?? null,
          volume: co?.volume ?? null,
          timestamp: new Date().toISOString(),
          source: 'psx',
        })
      }
    }
  } catch (_e) {}

  return NextResponse.json(
    { error: `Could not fetch price for ${symbol}` },
    { status: 502 }
  )
}
