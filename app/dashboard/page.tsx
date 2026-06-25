import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'
import type { Stock } from '@/lib/calc'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: stocks } = await supabase
    .from('stocks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const normalized = (stocks ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    sell_price: (s.sell_price as number) || (s.avg_rate as number),
  })) as Stock[]

  return <Dashboard initialStocks={normalized} userEmail={user.email ?? ''} />
}
