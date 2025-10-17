'use client'

import { useState } from 'react'
import { Upload, FileText, Check, AlertCircle } from 'lucide-react'

export default function OcrUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [count, setCount] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ id: string; product_name: string; quantity: number; price: number; sale_date: string }>>([])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setMessage('')
    setCount(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('prompt', 'Extract invoice line items into product_name, quantity, price, sale_date')

      const res = await fetch('/api/sales/ocr', {
        method: 'POST',
        body: form
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process invoice')
      }

      setCount(data.count)
      setItems(Array.isArray(data.items) ? data.items : [])
      setMessage(`Added ${data.count} sale records from invoice.`)
      setMessageType('success')
      event.target.value = ''
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage(msg)
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <FileText className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">OCR Invoice Upload</h2>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Supported files:</h3>
          <ul className="text-blue-800 text-sm">
            <li>• Images: JPG, PNG, GIF</li>
            <li>• Documents: PDF</li>
          </ul>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              messageType === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center">
              {messageType === 'success' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              {message}
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="ocr-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  {isLoading ? 'Processing...' : 'Upload Invoice (Image/PDF)'}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  JPG, PNG, GIF, or PDF
                </span>
              </label>
              <input
                id="ocr-upload"
                name="ocr-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif,application/pdf"
                onChange={handleUpload}
                disabled={isLoading}
                className="sr-only"
              />
            </div>
          </div>
        </div>

      </div>

      {items.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Added items</h3>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.product_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.quantity}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">₹{row.price}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.sale_date}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{row.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


