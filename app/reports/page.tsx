'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCcw, TrendingUp } from 'lucide-react'
import { getTodayYmdInTimeZone, getRelativeYmdInTimeZone } from '@/lib/date'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  const [zoomStartDate, setZoomStartDate] = useState<string>('')
  const [zoomEndDate, setZoomEndDate] = useState<string>('')
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
    const effectiveStart = zoomStartDate || startDate
    const effectiveEnd = zoomEndDate || endDate
    return sales.filter(s => {
      if (effectiveStart && s.sale_date < effectiveStart) return false
      if (effectiveEnd && s.sale_date > effectiveEnd) return false
      if (pf && s.product_name.toLowerCase() !== pf) return false
      return true
    })
  }, [sales, startDate, endDate, productFilter, zoomStartDate, zoomEndDate])

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; quantity: number; revenue: number }>()
    for (const s of filtered) {
      const key = s.sale_date
      const entry = map.get(key) || { date: key, quantity: 0, revenue: 0 }
      entry.quantity += Number(s.quantity)
      entry.revenue += Number(s.quantity) * Number(s.price)
      map.set(key, entry)
    }
    
    // Fill in missing dates between start and end
    const result = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
    const effectiveStart = zoomStartDate || startDate
    const effectiveEnd = zoomEndDate || endDate
    if (result.length > 0 && effectiveStart && effectiveEnd) {
      const start = new Date(effectiveStart)
      const end = new Date(effectiveEnd)
      const filledData: { date: string; quantity: number; revenue: number }[] = []
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const existing = map.get(dateStr)
        filledData.push(existing || { date: dateStr, quantity: 0, revenue: 0 })
      }
      return filledData
    }
    return result
  }, [filtered, startDate, endDate, zoomStartDate, zoomEndDate])

  const byProduct = useMemo(() => {
    const map = new Map<string, { product_name: string; quantity: number; revenue: number; lastSaleDate: string }>()
    for (const s of filtered) {
      const key = s.product_name
      const entry = map.get(key) || { product_name: key, quantity: 0, revenue: 0, lastSaleDate: s.sale_date }
      entry.quantity += Number(s.quantity)
      entry.revenue += Number(s.quantity) * Number(s.price)
      // Update to latest sale date
      if (s.sale_date > entry.lastSaleDate) {
        entry.lastSaleDate = s.sale_date
      }
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [filtered])

  // Product-wise daily breakdown for stacked charts
  const dailyByProduct = useMemo(() => {
    const dateMap = new Map<string, any>()
    for (const s of filtered) {
      const date = s.sale_date
      if (!dateMap.has(date)) {
        dateMap.set(date, { date })
      }
      const entry = dateMap.get(date)
      const productKey = s.product_name
      entry[productKey] = (entry[productKey] || 0) + Number(s.quantity)
    }
    
    // Fill in missing dates between start and end
    const result = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    const effectiveStart = zoomStartDate || startDate
    const effectiveEnd = zoomEndDate || endDate
    if (result.length > 0 && effectiveStart && effectiveEnd) {
      const start = new Date(effectiveStart)
      const end = new Date(effectiveEnd)
      const filledData: any[] = []
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const existing = dateMap.get(dateStr)
        filledData.push(existing || { date: dateStr })
      }
      return filledData
    }
    return result
  }, [filtered, startDate, endDate, zoomStartDate, zoomEndDate])

  // Get unique product names for the chart
  const chartProducts = useMemo(() => {
    return Array.from(new Set(filtered.map(s => s.product_name)))
  }, [filtered])

  // Color palette for products
  const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#06b6d4', '#f43f5e', '#22c55e', '#eab308', '#a855f7'
  ]

  const totalRevenue = useMemo(() => {
    return filtered.reduce((sum, s) => sum + (Number(s.quantity) * Number(s.price)), 0)
  }, [filtered])

  const totalQuantity = useMemo(() => {
    return filtered.reduce((sum, s) => sum + Number(s.quantity), 0)
  }, [filtered])

  // Calculate interval for x-axis labels based on data length
  const xAxisInterval = useMemo(() => {
    const dataLength = daily.length
    if (dataLength <= 7) return 0 // Show all labels
    if (dataLength <= 14) return 1 // Show every other label
    if (dataLength <= 30) return Math.floor(dataLength / 10) // Show ~10 labels
    return Math.floor(dataLength / 15) // Show ~15 labels for longer periods
  }, [daily])

  // Format date for display
  const formatXAxisDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    return `${month} ${day}`
  }

  // Handle chart click to zoom into a 7-day window (memoized)
  const handleChartClick = useCallback((data: any) => {
    if (data && data.activeLabel) {
      const clickedDate = new Date(data.activeLabel)
      const zoomStart = new Date(clickedDate)
      zoomStart.setDate(zoomStart.getDate() - 3) // 3 days before
      const zoomEnd = new Date(clickedDate)
      zoomEnd.setDate(zoomEnd.getDate() + 3) // 3 days after
      
      setZoomStartDate(zoomStart.toISOString().split('T')[0])
      setZoomEndDate(zoomEnd.toISOString().split('T')[0])
    }
  }, [])

  // Reset zoom (memoized)
  const resetZoom = useCallback(() => {
    setZoomStartDate('')
    setZoomEndDate('')
  }, [])

  const isZoomed = zoomStartDate !== '' || zoomEndDate !== ''

  // Limit data for performance - only show top products in pie charts
  const topProductsByRevenue = useMemo(() => {
    return byProduct.slice(0, 10) // Top 10 products
  }, [byProduct])

  const topProductsByQuantity = useMemo(() => {
    return byProduct.slice(0, 10) // Top 10 products
  }, [byProduct])


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
            <div className="flex items-end gap-2">
              <button onClick={() => { setStartDate(''); setEndDate(''); setProductFilter(''); resetZoom(); }} className="inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50">
                <RefreshCcw className="h-4 w-4 mr-2" />Reset All
              </button>
              {isZoomed && (
                <button onClick={resetZoom} className="inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600">
                  Reset Zoom
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => { const t = getTodayYmdInTimeZone(tz); setStartDate(t); setEndDate(t); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">Today (IST)</button>
            <button onClick={() => { const y = getRelativeYmdInTimeZone(-1, tz); setStartDate(y); setEndDate(y); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">Yesterday</button>
            <button onClick={() => { const end = getTodayYmdInTimeZone(tz); const start = getRelativeYmdInTimeZone(-6, tz); setStartDate(start); setEndDate(end); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">Last 7 days</button>
            <button onClick={() => { const end = getTodayYmdInTimeZone(tz); const d = new Date(end + 'T00:00:00Z'); const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); const y = first.getUTCFullYear(); const m = String(first.getUTCMonth()+1).padStart(2,'0'); const day = String(first.getUTCDate()).padStart(2,'0'); setStartDate(`${y}-${m}-${day}`); setEndDate(end); }} className="px-3 py-1.5 text-xs border rounded-lg bg-white hover:bg-slate-50">This month</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-sm font-medium opacity-90">Total Revenue</div>
            <div className="text-3xl font-bold mt-2">₹{totalRevenue.toFixed(2)}</div>
            <div className="text-xs opacity-75 mt-1">{filtered.length} transactions</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-sm font-medium opacity-90">Total Quantity Sold</div>
            <div className="text-3xl font-bold mt-2">{totalQuantity}</div>
            <div className="text-xs opacity-75 mt-1">units</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-sm font-medium opacity-90">Unique Products</div>
            <div className="text-3xl font-bold mt-2">{byProduct.length}</div>
            <div className="text-xs opacity-75 mt-1">different items</div>
          </div>
        </div>

        {/* Product-wise Quantity Breakdown (Stacked Bar Chart) */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Daily Sales by Product</h2>
            {isZoomed && (
              <span className="text-sm text-blue-600 font-medium">
                Zoomed: {formatXAxisDate(zoomStartDate)} - {formatXAxisDate(zoomEndDate)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">💡 Click on any bar to zoom into a 7-day window</p>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={dailyByProduct} 
                margin={{ top: 10, right: 150, left: 0, bottom: 20 }}
                onClick={handleChartClick}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={xAxisInterval}
                  tickFormatter={formatXAxisDate}
                />
                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: any) => [value, 'Qty']}
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }}
                />
                {chartProducts.map((product, idx) => (
                  <Bar 
                    key={product} 
                    dataKey={product} 
                    stackId="a" 
                    fill={COLORS[idx % COLORS.length]}
                    name={product}
                    cursor="pointer"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Distribution Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Revenue Distribution (Top 10)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProductsByRevenue}
                    cx="35%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {topProductsByRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${value.toFixed(2)}`} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', maxWidth: '45%' }}
                    formatter={(value, entry: any) => `${value}: ₹${entry.payload.revenue.toFixed(0)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Quantity Distribution (Top 10)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProductsByQuantity}
                    cx="35%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="quantity"
                  >
                    {topProductsByQuantity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', maxWidth: '45%' }}
                    formatter={(value, entry: any) => `${value}: ${entry.payload.quantity} units`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Daily Trend Line Chart */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Daily Sales Trend</h2>
            {isZoomed && (
              <span className="text-sm text-blue-600 font-medium">
                Zoomed: {formatXAxisDate(zoomStartDate)} - {formatXAxisDate(zoomEndDate)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">💡 Click on any point to zoom into a 7-day window</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={daily} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                onClick={handleChartClick}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }} 
                  interval={xAxisInterval}
                  tickFormatter={formatXAxisDate}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 12 }} label={{ value: 'Revenue', angle: 90, position: 'insideRight' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`₹${value}`, 'Revenue']
                    if (name === 'quantity') return [value, 'Quantity']
                    return [value, name]
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="quantity" 
                  stroke="#10b981" 
                  name="Quantity" 
                  strokeWidth={2} 
                  dot={{ r: 3, cursor: 'pointer' }} 
                  activeDot={{ r: 5 }} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  name="Revenue" 
                  strokeWidth={2} 
                  dot={{ r: 3, cursor: 'pointer' }} 
                  activeDot={{ r: 5 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Summary with Enhanced Styling */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Product Summary</h2>
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Sale</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">% of Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byProduct.map((row, idx) => {
                  const percentage = totalRevenue > 0 ? (row.revenue / totalRevenue * 100).toFixed(1) : '0'
                  return (
                    <tr key={row.product_name} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          {row.product_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.lastSaleDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {row.quantity} units
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600">₹{row.revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">₹{(row.revenue / row.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {byProduct.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center" colSpan={7}>No sales for selected filters.</td>
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


