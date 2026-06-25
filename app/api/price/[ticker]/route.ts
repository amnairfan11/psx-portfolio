import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const symbol = ticker.toUpperCase()

  try {
    const res = await fetch(`https://dps.psx.com.pk/company/${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      console.error(`[price/${symbol}] PSX HTTP ${res.status}`)
      return NextResponse.json({ error: `PSX returned ${res.status}` }, { status: 502 })
    }

    const html = await res.text()

    // Strip HTML tags and normalise whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')

    // The PSX page renders: "[Name] [Sector] Rs.PRICE CHANGE (PCT%) ..."
    // e.g. "National Bank of Pakistan COMMERCIAL BANKS Rs.176.12 0.33 (0.19%)"
    const priceBlock = text.match(
      /Rs\.\s*([\d,]+(?:\.\d+)?)\s+([-\d.]+)\s+\(([-\d.]+)%\)/
    )

    if (!priceBlock) {
      console.error(`[price/${symbol}] price block not found. snippet:`, text.slice(0, 500))
      return NextResponse.json({ error: 'Price not found on PSX page' }, { status: 502 })
    }

    const price     = parseFloat(priceBlock[1].replace(/,/g, ''))
    const change    = parseFloat(priceBlock[2])
    const changePct = parseFloat(priceBlock[3])

    // Extract LDCP (Last Day Closing Price) - appears as "LDCP 175.79" in stripped text
    const ldcpMatch = text.match(/LDCP\s+([\d.]+)/)
    const ldcp = ldcpMatch ? parseFloat(ldcpMatch[1]) : null

    // Extract volume - appears as "Volume 5,254,338" in stripped text
    const volMatch = text.match(/Volume\s+([\d,]+)/)
    const volume = volMatch ? parseInt(volMatch[1].replace(/,/g, ''), 10) : null

    return NextResponse.json({
      ticker: symbol,
      price,
      change,
      changePct,
      ldcp,
      volume,
      timestamp: new Date().toISOString(),
      source: 'psx',
    })
  } catch (e) {
    console.error(`[price/${symbol}] error:`, e)
    return NextResponse.json({ error: 'Failed to fetch from PSX' }, { status: 502 })
  }
}
