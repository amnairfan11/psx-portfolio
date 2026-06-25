export interface Stock {
  id: string
  user_id?: string
  ticker: string
  shares: number
  avg_rate: number
  sell_price: number
  price_min: number
  price_max: number
  brok_rate: number
  custom_brok?: boolean
}

export function getBrokRate(stock: Stock, _price: number): number {
  if (stock.custom_brok) return stock.brok_rate
  return 0.0015
}

export function calcStock(stock: Stock) {
  const buyBrokRate = getBrokRate(stock, stock.avg_rate)
  const buyBrok     = stock.avg_rate * buyBrokRate * stock.shares
  const totalCost   = stock.avg_rate * stock.shares + buyBrok

  const gross        = stock.sell_price * stock.shares
  const sellBrokRate = getBrokRate(stock, stock.sell_price)
  const sellBrok     = stock.sell_price * sellBrokRate * stock.shares
  const netProceeds  = gross - sellBrok

  const pretax    = netProceeds - totalCost
  const tax       = pretax > 0 ? pretax * 0.15 : 0
  const netProfit = pretax - tax
  const netPct    = (netProfit / totalCost) * 100

  return { totalCost, buyBrok, gross, sellBrok, sellBrokRate, netProceeds, pretax, tax, netProfit, netPct }
}

export function findTargetPrice(stock: Stock, targetPct: number): number {
  let lo = stock.price_min
  let hi = stock.price_max * 5
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const { netPct } = calcStock({ ...stock, sell_price: mid })
    if (netPct < targetPct) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function fmtPKR(n: number): string {
  return '₨' + Math.round(Math.abs(n)).toLocaleString('en-PK')
}

export function fmtSigned(n: number): string {
  return (n >= 0 ? '+' : '-') + fmtPKR(n)
}
