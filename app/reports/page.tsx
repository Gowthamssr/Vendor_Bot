'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCcw, TrendingUp } from 'lucide-react'
import { getTodayYmdInTimeZone, getRelativeYmdInTimeZone } from '@/lib/date'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface Sale {
  id: string
  product_name: string
  quantity: number
  price: number
  sale_date: string
}

export default function ReportsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [sales, setSales] = useState<Sale[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [productFilter, setProductFilter] = useState<string>('')
  const tz = 'Asia/Kolkata'
  useEffect(() => {
    // default range: last 7 days in IST
    const end = getTodayYmdInTimeZone(tz)
    const start = getRelativeYmdInTimeZone(-6, tz)
    setStartDate(start)
    setEndDate(end)
  }, [])

  useEffect(() => {
    const fetchSales = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/sales')
        const data = await res.json()
        if (!data.success) throw new Error('Failed to load sales')
        setSales(data.sales)
      } catch (e) {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSales()
  }, [router])

  const productNames = useMemo(() => {
    return Array.from(new Set(sales.map(s => s.product_name))).sort((a, b) => a.localeCompare(b))
  }, [sales])

  const filtered = useMemo(() => {
    const pf = productFilter.trim().toLowerCase()
    return sales.filter(s => {
      if (startDate && s.sale_date < startDate) return false
      if (endDate && s.sale_date > endDate) return false
      if (pf && s.product_name.toLowerCase() !== pf) return false
      return true
    })
  }, [sales, startDate, endDate, productFilter])

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; quantity: number; revenue: number }>()
    for (const s of filtered) {
      const key = s.sale_date
      const entry = map.get(key) || { date: key, quantity: 0, revenue: 0 }
      entry.quantity += Number(s.quantity)
      entry.revenue += Number(s.quantity) * Number(s.price)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered])

  const byProduct = useMemo(() => {
    const map = new Map<string, { product_name: string; quantity: number; revenue: number }>()
    for (const s of filtered) {
      const key = s.product_name
      const entry = map.get(key) || { product_name: key, quantity: 0, revenue: 0 }
      entry.quantity += Number(s.quantity)
      entry.revenue += Number(s.quantity) * Number(s.price)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [filtered])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <TrendingUp className="h-6 w-6 text-primary-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <button onClick={() => router.push('/dashboard')} className="ml-auto inline-flex items-center px-3 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50">
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
              <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="">All products</option>
                {productNames.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setStartDate(''); setEndDate(''); setProductFilter(''); }} className="inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50">
                <RefreshCcw className="h-4 w-4 mr-2" />Reset
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => { const t = getTodayYmdInTimeZone(tz); setStartDate(t); setEndDate(t); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">Today (IST)</button>
            <button onClick={() => { const y = getRelativeYmdInTimeZone(-1, tz); setStartDate(y); setEndDate(y); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">Yesterday</button>
            <button onClick={() => { const end = getTodayYmdInTimeZone(tz); const start = getRelativeYmdInTimeZone(-6, tz); setStartDate(start); setEndDate(end); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">Last 7 days</button>
            <button onClick={() => { const end = getTodayYmdInTimeZone(tz); const d = new Date(end + 'T00:00:00Z'); const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); const y = first.getUTCFullYear(); const m = String(first.getUTCMonth()+1).padStart(2,'0'); const day = String(first.getUTCDate()).padStart(2,'0'); setStartDate(`${y}-${m}-${day}`); setEndDate(end); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">This month</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily Sales (Quantity & Revenue)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => name === 'revenue' ? [`₹${value}`, 'revenue'] : [value, name]} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#1f2937" name="quantity" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#2563eb" name="revenue" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Summary */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Product Summary</h2>
          <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byProduct.map(row => (
                  <tr key={row.product_name}>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.product_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.quantity}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">₹{row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                {byProduct.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-sm text-gray-500" colSpan={3}>No sales for selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Detail */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Sales Detail</h2>
          <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 text-sm text-gray-900">{s.sale_date}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{s.product_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{s.quantity}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">₹{Number(s.price).toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">₹{(Number(s.quantity)*Number(s.price)).toFixed(2)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-sm text-gray-500" colSpan={5}>No sales for selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


