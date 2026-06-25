import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const symbol = ticker.toUpperCase()

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://dps.psx.com.pk/',
    'Origin': 'https://dps.psx.com.pk',
    'X-Requested-With': 'XMLHttpRequest',
  }

  // Try 1: individual company endpoint
  try {
    const res = await fetch(`https://dps.psx.com.pk/api/v1/companies/${symbol}`, {
      headers,
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
        })
      }
    }
  } catch (_e) {}

  // Try 2: companies list filtered by symbol
  try {
    const res = await fetch(`https://dps.psx.com.pk/api/v1/companies?symbol=${symbol}`, {
      headers,
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
        })
      }
    }
  } catch (_e) {}

  return NextResponse.json(
    { error: `Could not fetch price for ${symbol} from PSX` },
    { status: 502 }
  )
}
