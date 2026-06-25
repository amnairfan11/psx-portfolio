'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Stock } from '@/lib/calc'

interface Props {
  onSave: (stock: Omit<Stock, 'id' | 'user_id'>) => void
  onClose: () => void
  initial?: Stock
}

const PRESETS: Record<string, Partial<Omit<Stock, 'id' | 'user_id' | 'ticker' | 'sell_price'>>> = {
  NBP:  { avg_rate: 191.07, shares: 2200, price_min: 100, price_max: 400, brok_rate: 0.0015 },
  AKBL: { avg_rate: 93.19,  shares: 500,  price_min: 50,  price_max: 250, brok_rate: 0.0015 },
  BOP:  { avg_rate: 29.73,  shares: 8000, price_min: 10,  price_max: 100, brok_rate: 0.0015 },
  DCR:  { avg_rate: 36.92,  shares: 2000, price_min: 15,  price_max: 120, brok_rate: 0.0015 },
  HUBC: { avg_rate: 194.06, shares: 1200, price_min: 100, price_max: 400, brok_rate: 0.0015 },
  KEL:  { avg_rate: 7.98,   shares: 850,  price_min: 1,   price_max: 20,  brok_rate: 0.0003, custom_brok: true },
  NCPL: { avg_rate: 70.53,  shares: 2000, price_min: 30,  price_max: 200, brok_rate: 0.0015 },
}

export default function StockModal({ onSave, onClose, initial }: Props) {
  const [ticker, setTicker]       = useState(initial?.ticker ?? '')
  const [shares, setShares]       = useState(String(initial?.shares ?? ''))
  const [avgRate, setAvgRate]     = useState(String(initial?.avg_rate ?? ''))
  const [sellPrice, setSellPrice] = useState(String(initial?.sell_price ?? ''))
  const [priceMin, setPriceMin]   = useState(String(initial?.price_min ?? ''))
  const [priceMax, setPriceMax]   = useState(String(initial?.price_max ?? ''))
  const [brokRate, setBrokRate]   = useState(String(initial ? initial.brok_rate * 100 : 0.15))
  const [customBrok, setCustomBrok] = useState(initial?.custom_brok ?? false)

  function applyPreset(t: string) {
    const p = PRESETS[t.toUpperCase()]
    if (!p) return
    if (p.shares    !== undefined) setShares(String(p.shares))
    if (p.avg_rate  !== undefined) { setAvgRate(String(p.avg_rate)); setSellPrice(String(p.avg_rate)) }
    if (p.price_min !== undefined) setPriceMin(String(p.price_min))
    if (p.price_max !== undefined) setPriceMax(String(p.price_max))
    if (p.brok_rate !== undefined) setBrokRate(String(p.brok_rate * 100))
    if (p.custom_brok !== undefined) setCustomBrok(p.custom_brok)
  }

  function handleTickerChange(v: string) {
    const upper = v.toUpperCase()
    setTicker(upper)
    applyPreset(upper)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const avg = parseFloat(avgRate)
    onSave({
      ticker: ticker.toUpperCase().trim(),
      shares: parseFloat(shares),
      avg_rate: avg,
      sell_price: parseFloat(sellPrice) || avg,
      price_min: parseFloat(priceMin) || avg * 0.5,
      price_max: parseFloat(priceMax) || avg * 2.5,
      brok_rate: parseFloat(brokRate) / 100,
      custom_brok: customBrok,
    })
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
  const labelCls = "block text-slate-400 text-xs mb-1"

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-white font-semibold">{initial ? 'Edit Stock' : 'Add Stock'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Ticker */}
          <div>
            <label className={labelCls}>Ticker Symbol</label>
            <input
              value={ticker}
              onChange={e => handleTickerChange(e.target.value)}
              required
              placeholder="e.g. NBP"
              className={inputCls}
            />
          </div>

          {/* Shares + Avg Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Shares Held</label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                required min="1" step="1"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Avg Buy Rate ₨</label>
              <input
                type="number"
                value={avgRate}
                onChange={e => setAvgRate(e.target.value)}
                required min="0.01" step="0.01"
                className={inputCls}
              />
            </div>
          </div>

          {/* Sell price */}
          <div>
            <label className={labelCls}>Starting Sell Price ₨ (slider default)</label>
            <input
              type="number"
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
              min="0.01" step="0.01"
              placeholder="Defaults to avg buy rate"
              className={inputCls}
            />
          </div>

          {/* Min + Max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Slider Min ₨</label>
              <input
                type="number"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                min="0" step="0.01"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Slider Max ₨</label>
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                min="0" step="0.01"
                className={inputCls}
              />
            </div>
          </div>

          {/* Brokerage */}
          <div>
            <label className={labelCls}>Brokerage Rate %</label>
            <input
              type="number"
              value={brokRate}
              onChange={e => setBrokRate(e.target.value)}
              min="0" step="0.001"
              className={inputCls}
            />
          </div>

          {/* Custom brok toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={customBrok}
              onChange={e => setCustomBrok(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-slate-300 text-sm">Use custom brokerage rate (overrides standard 0.15%)</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm"
            >
              {initial ? 'Save Changes' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
