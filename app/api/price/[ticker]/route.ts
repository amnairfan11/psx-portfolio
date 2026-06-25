import { NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const symbol = `${ticker.toUpperCase()}.KA`

  try {
    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false })
    const price = quote.regularMarketPrice ?? null

    if (price === null) {
      return NextResponse.json({ error: 'Price not available' }, { status: 404 })
    }

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      symbol,
      price,
      currency: quote.currency ?? 'PKR',
      marketState: quote.marketState ?? 'UNKNOWN',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`Failed to fetch price for ${symbol}:`, err)
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
  }
}
