'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, LogOut, TrendingUp, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calcStock, fmtPKR, fmtSigned, type Stock } from '@/lib/calc'
import StockCard from './StockCard'
import StockModal from './StockModal'

interface Props {
  initialStocks: Stock[]
  userEmail: string
}

export default function Dashboard({ initialStocks, userEmail }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [stocks, setStocks]       = useState<Stock[]>(initialStocks)
  const [showModal, setShowModal] = useState(false)
  const [editStock, setEditStock] = useState<Stock | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null)

  // Portfolio totals
  const totals = stocks.reduce(
    (acc, s) => {
      const c = calcStock(s)
      return {
        invested:  acc.invested  + c.totalCost,
        netProfit: acc.netProfit + c.netProfit,
        brokerage: acc.brokerage + c.buyBrok + c.sellBrok,
        tax:       acc.tax       + c.tax,
      }
    },
    { invested: 0, netProfit: 0, brokerage: 0, tax: 0 }
  )
  const netPct = totals.invested > 0 ? (totals.netProfit / totals.invested) * 100 : 0

  async function handleAddStock(data: Omit<Stock, 'id' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: inserted } = await supabase
      .from('stocks')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (inserted) setStocks(prev => [...prev, inserted as Stock])
    setShowModal(false)
  }

  async function handleEditStock(data: Omit<Stock, 'id' | 'user_id'>) {
    if (!editStock) return
    await supabase.from('stocks').update(data).eq('id', editStock.id)
    setStocks(prev => prev.map(s => s.id === editStock.id ? { ...s, ...data } : s))
    setEditStock(null)
  }

  const handleUpdate = useCallback((id: string, updates: Partial<Stock>) => {
    setStocks(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    clearTimeout((window as Window & { __saveTimer?: ReturnType<typeof setTimeout> }).__saveTimer)
    ;(window as Window & { __saveTimer?: ReturnType<typeof setTimeout> }).__saveTimer = setTimeout(async () => {
      await supabase.from('stocks').update(updates).eq('id', id)
    }, 800)
  }, [supabase])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this stock from your portfolio?')) return
    await supabase.from('stocks').delete().eq('id', id)
    setStocks(prev => prev.filter(s => s.id !== id))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  async function handleRefreshPrices() {
    setRefreshing(true)
    setRefreshStatus(null)

    const results = await Promise.allSettled(
      stocks.map(async (stock) => {
        const res = await fetch(`/api/price/${stock.ticker}`)
        if (!res.ok) throw new Error(`No price for ${stock.ticker}`)
        const json = await res.json()
        return { id: stock.id, ticker: stock.ticker, price: json.price as number }
      })
    )

    let updated = 0
    let failed: string[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { id, price } = result.value
        handleUpdate(id, { sell_price: price })
        updated++
      } else {
        const msg = result.reason?.message ?? ''
        const ticker = msg.match(/No price for (.+)/)?.[1]
        if (ticker) failed.push(ticker)
      }
    }

    if (failed.length === 0) {
      setRefreshStatus(`✓ Updated ${updated} stock${updated !== 1 ? 's' : ''} with live prices`)
    } else if (updated === 0) {
      setRefreshStatus(`⚠ Could not fetch prices (market may be closed or tickers not on Yahoo Finance)`)
    } else {
      setRefreshStatus(`✓ Updated ${updated} — could not fetch: ${failed.join(', ')}`)
    }

    setRefreshing(false)
    setTimeout(() => setRefreshStatus(null), 5000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-10 bg-slate-900/60 backdrop-blur-sm border-b border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white flex-1">PSX Portfolio</span>
          <span className="text-slate-500 text-sm hidden sm:block">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Log out</span>
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Total Invested"  value={fmtPKR(totals.invested)}  colour="text-white" />
          <SummaryCard
            label="Net Profit"
            value={fmtSigned(totals.netProfit)}
            sub={`${netPct >= 0 ? '+' : ''}${netPct.toFixed(2)}%`}
            colour={totals.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <SummaryCard label="Total Brokerage" value={'-' + fmtPKR(totals.brokerage)} colour="text-red-400" />
          <SummaryCard label="Tax 15% CGT"     value={'-' + fmtPKR(totals.tax)}       colour="text-red-400" />
        </div>

        {/* Header row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-300 text-sm font-medium flex-1">
            {stocks.length} stock{stocks.length !== 1 ? 's' : ''}
          </span>

          {stocks.length > 0 && (
            <button
              onClick={handleRefreshPrices}
              disabled={refreshing}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Fetching…' : 'Refresh Prices'}
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <PlusCircle size={16} />
            Add Stock
          </button>
        </div>

        {/* Refresh status */}
        {refreshStatus && (
          <div className={`text-sm px-4 py-2.5 rounded-xl border ${
            refreshStatus.startsWith('✓')
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {refreshStatus}
            <span className="text-xs ml-2 opacity-60">(data delayed ~15 min)</span>
          </div>
        )}

        {/* Stock list */}
        {stocks.length === 0 ? (
          <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center">
            <TrendingUp size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No stocks yet. Add your first position to get started.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Add Stock
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {stocks.map(s => (
              <StockCard
                key={s.id}
                stock={s}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={stock => setEditStock(stock)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <StockModal onSave={handleAddStock} onClose={() => setShowModal(false)} />
      )}
      {editStock && (
        <StockModal initial={editStock} onSave={handleEditStock} onClose={() => setEditStock(null)} />
      )}
    </div>
  )
}

function SummaryCard({
  label, value, sub, colour,
}: { label: string; value: string; sub?: string; colour: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
      <div className="text-slate-500 text-xs mb-1">{label}</div>
      <div className={`font-semibold text-lg ${colour}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${colour} opacity-70`}>{sub}</div>}
    </div>
  )
}
