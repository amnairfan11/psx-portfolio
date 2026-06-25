import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const symbol = `${ticker.toUpperCase()}.KA`

  try {
    // Dynamic import avoids ESM/CJS issues at build time
    const yf = await import('yahoo-finance2')
    const yahooFinance = yf.default

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = await (yahooFinance.quote as any)(symbol)
    const price: number | null = quote?.regularMarketPrice ?? null

    if (price === null) {
      return NextResponse.json({ error: 'Price not available' }, { status: 404 })
    }

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      symbol,
      price,
      currency: quote?.currency ?? 'PKR',
      marketState: quote?.marketState ?? 'UNKNOWN',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`Failed to fetch price for ${symbol}:`, err)
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
  }
}
