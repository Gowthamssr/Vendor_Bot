'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCcw, TrendingUp, Download, Calendar, Filter } from 'lucide-react'
import { getTodayYmdInTimeZone, getRelativeYmdInTimeZone } from '@/lib/date'
import * as XLSX from 'xlsx'
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
  const [isProcessing, setIsProcessing] = useState(false)
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

    // Performance optimization: early return if no filters
    if (!effectiveStart && !effectiveEnd && !pf) return sales

    return sales.filter(s => {
      if (effectiveStart && s.sale_date < effectiveStart) return false
      if (effectiveEnd && s.sale_date > effectiveEnd) return false
      if (pf && s.product_name.toLowerCase() !== pf) return false
      return true
    })
  }, [sales, startDate, endDate, productFilter, zoomStartDate, zoomEndDate])

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; quantity: number; revenue: number }>()

    // Performance optimization: batch process sales data
    for (const s of filtered) {
      const key = s.sale_date
      const entry = map.get(key) || { date: key, quantity: 0, revenue: 0 }
      entry.quantity += Number(s.quantity)
      entry.revenue += Number(s.quantity) * Number(s.price)
      map.set(key, entry)
    }

    // Only fill missing dates for reasonable date ranges (< 365 days)
    const effectiveStart = zoomStartDate || startDate
    const effectiveEnd = zoomEndDate || endDate

    if (effectiveStart && effectiveEnd) {
      const start = new Date(effectiveStart)
      const end = new Date(effectiveEnd)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      // Performance: only fill gaps for reasonable date ranges
      if (daysDiff <= 365 && daysDiff > 0) {
        const filledData: { date: string; quantity: number; revenue: number }[] = []

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const existing = map.get(dateStr)
          filledData.push(existing || { date: dateStr, quantity: 0, revenue: 0 })
        }
        return filledData
      }
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
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

  // Product-wise daily breakdown for stacked charts (optimized)
  const dailyByProduct = useMemo(() => {
    const dateMap = new Map<string, any>()

    // Performance: limit to top 15 products for chart readability
    const topProducts = byProduct.slice(0, 15).map(p => p.product_name)

    for (const s of filtered) {
      // Only include top products in stacked chart for performance
      if (!topProducts.includes(s.product_name)) continue

      const date = s.sale_date
      if (!dateMap.has(date)) {
        dateMap.set(date, { date })
      }
      const entry = dateMap.get(date)
      const productKey = s.product_name
      entry[productKey] = (entry[productKey] || 0) + Number(s.quantity)
    }

    // Performance optimization: same as daily chart
    const effectiveStart = zoomStartDate || startDate
    const effectiveEnd = zoomEndDate || endDate

    if (effectiveStart && effectiveEnd) {
      const start = new Date(effectiveStart)
      const end = new Date(effectiveEnd)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff <= 365 && daysDiff > 0) {
        const filledData: any[] = []

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const existing = dateMap.get(dateStr)
          filledData.push(existing || { date: dateStr })
        }
        return filledData
      }
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered, startDate, endDate, zoomStartDate, zoomEndDate, byProduct])

  // Get unique product names for the chart (limit for performance)
  const chartProducts = useMemo(() => {
    // Limit to top 15 products for better chart performance and readability
    return byProduct.slice(0, 15).map(p => p.product_name)
  }, [byProduct])

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

  // CSV download fallback
  const downloadCSV = useCallback(() => {
    try {
      const csvData = [
        ['Product Name', 'Last Sale Date', 'Total Quantity', 'Total Revenue', 'Avg Price per Unit', 'Percentage of Total'],
        ...byProduct.map((product, index) => {
          const percentage = totalRevenue > 0 ? ((product.revenue / totalRevenue) * 100).toFixed(1) : '0'
          const avgPrice = product.quantity > 0 ? (product.revenue / product.quantity).toFixed(2) : '0'
          return [
            product.product_name,
            product.lastSaleDate,
            product.quantity.toString(),
            product.revenue.toFixed(2),
            avgPrice,
            percentage + '%'
          ]
        })
      ]

      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `sales-report-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('CSV download error:', error)
      alert('Failed to download CSV file')
    }
  }, [byProduct, totalRevenue])

  // Excel download functionality
  const downloadExcel = useCallback(() => {
    console.log('Starting Excel download...')
    setIsProcessing(true)

    // Add a small delay to ensure UI updates
    setTimeout(() => {
      try {
        console.log('Creating workbook...')

        // Test if XLSX is available
        if (typeof XLSX === 'undefined') {
          console.log('XLSX not available, falling back to CSV')
          setIsProcessing(false)
          downloadCSV()
          return
        }

        // Create workbook with actual data
        const wb = XLSX.utils.book_new()

        // Product Summary Sheet
        const productHeaders = ['Rank', 'Product Name', 'Last Sale Date', 'Total Quantity', 'Total Revenue', 'Avg Price per Unit', 'Percentage']
        const productData = [productHeaders]

        byProduct.forEach((product, index) => {
          const percentage = totalRevenue > 0 ? ((product.revenue / totalRevenue) * 100).toFixed(1) : '0'
          const avgPrice = product.quantity > 0 ? (product.revenue / product.quantity).toFixed(2) : '0'

          productData.push([
            (index + 1).toString(),
            product.product_name,
            product.lastSaleDate,
            product.quantity.toString(),
            product.revenue.toFixed(2),
            avgPrice,
            percentage + '%'
          ])
        })

        const productWs = XLSX.utils.aoa_to_sheet(productData)
        XLSX.utils.book_append_sheet(wb, productWs, 'Product Summary')

        // Transactions Sheet (limit to 1000 for performance)
        const transactionHeaders = ['Date', 'Product Name', 'Quantity', 'Unit Price', 'Total Amount']
        const transactionData = [transactionHeaders]

        const limitedTransactions = filtered.slice(0, 1000) // Limit for performance
        limitedTransactions.forEach(sale => {
          const totalAmount = (Number(sale.quantity) * Number(sale.price)).toFixed(2)
          transactionData.push([
            sale.sale_date,
            sale.product_name,
            sale.quantity.toString(),
            Number(sale.price).toFixed(2),
            totalAmount
          ])
        })

        const transactionWs = XLSX.utils.aoa_to_sheet(transactionData)
        XLSX.utils.book_append_sheet(wb, transactionWs, 'Transactions')

        console.log('Workbook created, attempting download...')

        // Generate filename
        const filename = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`

        // Download file
        XLSX.writeFile(wb, filename)

        console.log('Download initiated successfully')

      } catch (error) {
        console.error('Excel download error:', error)
        console.log('Falling back to CSV download')
        downloadCSV()
      } finally {
        setIsProcessing(false)
      }
    }, 100)
  }, [byProduct, filtered, totalRevenue, downloadCSV])


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

        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 mb-6 backdrop-blur-sm">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-slate-600 mr-2" />
            <h3 className="text-lg font-semibold text-slate-800">Filter & Date Range</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Start Date */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1.5 text-slate-500" />
                Start Date
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-slate-50/50 
                           focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 
                           transition-all duration-300 ease-in-out
                           hover:border-slate-300 hover:bg-white
                           group-hover:shadow-md
                           [&::-webkit-calendar-picker-indicator]:opacity-70 
                           [&::-webkit-calendar-picker-indicator]:hover:opacity-100
                           [&::-webkit-calendar-picker-indicator]:cursor-pointer
                           [&::-webkit-calendar-picker-indicator]:transition-opacity" 
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* End Date */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1.5 text-slate-500" />
                End Date
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-slate-50/50 
                           focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 
                           transition-all duration-300 ease-in-out
                           hover:border-slate-300 hover:bg-white
                           group-hover:shadow-md
                           [&::-webkit-calendar-picker-indicator]:opacity-70 
                           [&::-webkit-calendar-picker-indicator]:hover:opacity-100
                           [&::-webkit-calendar-picker-indicator]:cursor-pointer
                           [&::-webkit-calendar-picker-indicator]:transition-opacity" 
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Product Filter */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Filter className="h-4 w-4 mr-1.5 text-slate-500" />
                Product Filter
              </label>
              <div className="relative">
                <select 
                  value={productFilter} 
                  onChange={e => setProductFilter(e.target.value)} 
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-slate-50/50 
                           focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 
                           transition-all duration-300 ease-in-out
                           hover:border-slate-300 hover:bg-white
                           group-hover:shadow-md
                           appearance-none cursor-pointer"
                >
                  <option value="">All products</option>
                  {productNames.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium text-slate-700 mb-2 opacity-0">Actions</div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); setProductFilter(''); resetZoom(); }} 
                  className="inline-flex items-center justify-center px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50/50 
                           hover:bg-white hover:border-slate-300 hover:shadow-md
                           focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400
                           transition-all duration-300 ease-in-out group"
                >
                  <RefreshCcw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Reset All
                </button>
                {isZoomed && (
                  <button 
                    onClick={resetZoom} 
                    className="inline-flex items-center justify-center px-4 py-3 border-2 border-blue-200 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 
                             hover:bg-blue-100 hover:border-blue-300 hover:shadow-md
                             focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400
                             transition-all duration-300 ease-in-out"
                  >
                    Reset Zoom
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Quick Date Selection */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center mb-3">
              <Calendar className="h-4 w-4 text-slate-500 mr-2" />
              <span className="text-sm font-medium text-slate-600">Quick Date Selection</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => { const t = getTodayYmdInTimeZone(tz); setStartDate(t); setEndDate(t); }} 
                className="px-4 py-2 text-sm font-medium border-2 border-emerald-200 rounded-xl bg-emerald-50 text-emerald-700 
                         hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-md hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400
                         transition-all duration-200 ease-in-out"
              >
                Today
              </button>
              <button 
                onClick={() => { const y = getRelativeYmdInTimeZone(-1, tz); setStartDate(y); setEndDate(y); }} 
                className="px-4 py-2 text-sm font-medium border-2 border-amber-200 rounded-xl bg-amber-50 text-amber-700 
                         hover:bg-amber-100 hover:border-amber-300 hover:shadow-md hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400
                         transition-all duration-200 ease-in-out"
              >
                Yesterday
              </button>
              <button 
                onClick={() => { const end = getTodayYmdInTimeZone(tz); const start = getRelativeYmdInTimeZone(-6, tz); setStartDate(start); setEndDate(end); }} 
                className="px-4 py-2 text-sm font-medium border-2 border-blue-200 rounded-xl bg-blue-50 text-blue-700 
                         hover:bg-blue-100 hover:border-blue-300 hover:shadow-md hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400
                         transition-all duration-200 ease-in-out"
              >
                Last 7 Days
              </button>
              <button 
                onClick={() => { const end = getTodayYmdInTimeZone(tz); const d = new Date(end + 'T00:00:00Z'); const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); const y = first.getUTCFullYear(); const m = String(first.getUTCMonth() + 1).padStart(2, '0'); const day = String(first.getUTCDate()).padStart(2, '0'); setStartDate(`${y}-${m}-${day}`); setEndDate(end); }} 
                className="px-4 py-2 text-sm font-medium border-2 border-purple-200 rounded-xl bg-purple-50 text-purple-700 
                         hover:bg-purple-100 hover:border-purple-300 hover:shadow-md hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-400
                         transition-all duration-200 ease-in-out"
              >
                This Month
              </button>
              <button 
                onClick={() => { 
                  const end = getTodayYmdInTimeZone(tz); 
                  const start = getRelativeYmdInTimeZone(-29, tz); 
                  setStartDate(start); 
                  setEndDate(end); 
                }} 
                className="px-4 py-2 text-sm font-medium border-2 border-indigo-200 rounded-xl bg-indigo-50 text-indigo-700 
                         hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-md hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400
                         transition-all duration-200 ease-in-out"
              >
                Last 30 Days
              </button>
            </div>
          </div>

          {/* Performance Warning for Large Date Ranges */}
          {(() => {
            if (!startDate || !endDate) return null
            const start = new Date(startDate)
            const end = new Date(endDate)
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff > 365) {
              return (
                <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Large Date Range Selected</h3>
                      <div className="mt-1 text-sm text-amber-700">
                        You've selected <span className="font-semibold">{daysDiff} days</span> of data. Charts may load slowly with large datasets. Consider using smaller date ranges for better performance.
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })()}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Product Summary</h2>
            <button
              onClick={() => {
                console.log('Download button clicked')
                console.log('Filtered data length:', filtered.length)
                console.log('ByProduct length:', byProduct.length)
                downloadExcel()
              }}
              disabled={isProcessing || filtered.length === 0}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel ({filtered.length} records)
                </>
              )}
            </button>
          </div>
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


