import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const symbol = ticker.toUpperCase()

  // Try PSX data portal internal API first
  try {
    const psxRes = await fetch(
      `https://dps.psx.com.pk/api/v1/companies/${symbol}`,
      {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://dps.psx.com.pk/',
          'Origin': 'https://dps.psx.com.pk',
          'X-Requested-With': 'XMLHttpRequest',
        },
        next: { revalidate: 0 },
      }
    )

    if (psxRes.ok) {
      const contentType = psxRes.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const data = await psxRes.json()
        // PSX API returns fields like: current, ldcp (last day closing price), symbol
        const price = data?.current ?? data?.ldcp ?? data?.close ?? null
        if (price !== null) {
          return NextResponse.json({
            ticker: symbol,
            price: Number(price),
            change: data?.change ?? null,
            changePct: data?.change_p ?? null,
            volume: data?.volume ?? null,
            source: 'psx',
            timestamp: new Date().toISOString(),
          })
        }
      }
    }
  } catch (_e) {
    // fall through to next source
  }

  // Fallback: try PSX trading panel summary endpoint
  try {
    const summaryRes = await fetch(
      `https://dps.psx.com.pk/api/v1/companies?symbol=${symbol}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://dps.psx.com.pk/',
        },
        next: { revalidate: 0 },
      }
    )

    if (summaryRes.ok) {
      const data = await summaryRes.json()
      // Response may be array or object with data array
      const companies: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : (data?.data ?? data?.companies ?? [])
      const company = companies.find(
        (c: Record<string, unknown>) =>
          (c.symbol as string)?.toUpperCase() === symbol
      )
      const price = company?.current ?? company?.ldcp ?? null
      if (price !== null) {
        return NextResponse.json({
          ticker: symbol,
          price: Number(price),
          change: company?.change ?? null,
          changePct: company?.change_p ?? null,
          volume: company?.volume ?? null,
          source: 'psx',
          timestamp: new Date().toISOString(),
        })
      }
    }
  } catch (_e) {
    // fall through
  }

  // Last fallback: Yahoo Finance chart API (works for some PSX stocks)
  try {
    const yfRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.KA?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 0 },
      }
    )

    if (yfRes.ok) {
      const data = await yfRes.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (meta?.regularMarketPrice != null) {
        return NextResponse.json({
          ticker: symbol,
          price: meta.regularMarketPrice as number,
          change: null,
          changePct: null,
          volume: meta.regularMarketVolume ?? null,
          source: 'yahoo',
          timestamp: new Date().toISOString(),
        })
      }
    }
  } catch (_e) {
    // all sources failed
  }

  return NextResponse.json(
    { error: `Could not fetch price for ${symbol} from any source` },
    { status: 502 }
  )
}
