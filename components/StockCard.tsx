'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { calcStock, findTargetPrice, fmtPKR, fmtSigned, type Stock } from '@/lib/calc'

interface Props {
  stock: Stock
  onUpdate: (id: string, updates: Partial<Stock>) => void
  onDelete: (id: string) => void
  onEdit: (stock: Stock) => void
}

function returnBadgeClass(pct: number) {
  if (pct < 0)   return 'bg-red-500/15 text-red-400 border-red-500/30'
  if (pct < 25)  return 'bg-green-500/15 text-green-400 border-green-500/30'
  if (pct < 50)  return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  if (pct < 75)  return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}

export default function StockCard({ stock, onUpdate, onDelete, onEdit }: Props) {
  const [expanded, setExpanded] = useState(true)

  const calc = calcStock(stock)
  const step = stock.price_min < 20 ? 0.01 : 0.5

  const breakEven = findTargetPrice(stock, 0)
  const t25 = findTargetPrice(stock, 25)
  const t50 = findTargetPrice(stock, 50)
  const t75 = findTargetPrice(stock, 75)

  const targets = [
    { label: 'Break-even', price: breakEven, pct: 0, colourBase: 'slate' },
    { label: '25%',        price: t25,       pct: 25, colourBase: 'blue' },
    { label: '50%',        price: t50,       pct: 50, colourBase: 'amber' },
    { label: '75%',        price: t75,       pct: 75, colourBase: 'red' },
  ]

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="font-bold text-white text-base flex-1">{stock.ticker}</span>

        {/* Return badge */}
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${returnBadgeClass(calc.netPct)}`}>
          {calc.netPct >= 0 ? '+' : ''}{calc.netPct.toFixed(2)}%
        </span>

        <button
          onClick={() => onEdit(stock)}
          className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
          title="Edit"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => onDelete(stock.id)}
          className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 pt-4">
          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-xs mb-1">Shares</label>
              <input
                type="number"
                value={stock.shares}
                min="1" step="1"
                onChange={e => onUpdate(stock.id, { shares: parseFloat(e.target.value) || stock.shares })}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs mb-1">Avg Rate ₨</label>
              <input
                type="number"
                value={stock.avg_rate}
                min="0.01" step="0.01"
                onChange={e => onUpdate(stock.id, { avg_rate: parseFloat(e.target.value) || stock.avg_rate })}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sell price slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-500 text-xs">Sell Price</label>
              <span className="text-white font-semibold text-sm">₨{stock.sell_price.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={stock.price_min}
              max={stock.price_max}
              step={step}
              value={stock.sell_price}
              onChange={e => onUpdate(stock.id, { sell_price: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-slate-600 text-xs mt-1">
              <span>₨{stock.price_min}</span>
              <span>₨{stock.price_max}</span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Invested',       value: fmtPKR(calc.totalCost),  colour: 'text-slate-300' },
              { label: 'Buy Brokerage',  value: '-' + fmtPKR(calc.buyBrok),   colour: 'text-red-400' },
              { label: 'Sell Brokerage', value: '-' + fmtPKR(calc.sellBrok),  colour: 'text-red-400' },
              { label: 'Pre-tax Profit', value: fmtSigned(calc.pretax),  colour: calc.pretax >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Tax 15%',        value: '-' + fmtPKR(calc.tax),       colour: 'text-red-400' },
            ].map(m => (
              <div key={m.label} className="bg-slate-900/40 rounded-lg p-2.5 text-center">
                <div className="text-slate-500 text-xs mb-1">{m.label}</div>
                <div className={`text-sm font-medium ${m.colour}`}>{m.value}</div>
              </div>
            ))}
            {/* Net profit — highlighted */}
            <div className="bg-slate-900/40 rounded-lg p-2.5 text-center border border-green-500/30">
              <div className="text-slate-500 text-xs mb-1">Net Profit</div>
              <div className={`text-sm font-semibold ${calc.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtSigned(calc.netProfit)}
              </div>
            </div>
          </div>

          {/* Target price pills */}
          <div className="flex flex-wrap gap-2">
            {targets.map(t => {
              const reached = stock.sell_price >= t.price
              return (
                <div
                  key={t.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    reached
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : t.colourBase === 'slate'
                        ? 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                        : t.colourBase === 'blue'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : t.colourBase === 'amber'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {reached && <CheckCircle size={12} />}
                  <span>{t.label}</span>
                  <span className="opacity-75">→ ₨{t.price.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
