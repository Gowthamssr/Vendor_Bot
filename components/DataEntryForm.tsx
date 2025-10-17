'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'

export default function DataEntryForm() {
  const [formData, setFormData] = useState({
    product_name: '',
    quantity: '',
    price: '',
    sale_date: new Date().toISOString().split('T')[0]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: formData.product_name,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price),
          sale_date: formData.sale_date
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Sale recorded successfully!')
        setMessageType('success')
        setFormData({
          product_name: '',
          quantity: '',
          price: '',
          sale_date: new Date().toISOString().split('T')[0]
        })
      } else {
        setMessage(data.error || 'Failed to record sale')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="max-w-2xl mx-auto h-full overflow-y-auto scrollbar-none-mobile">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <Plus className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Add New Sale</h2>
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
              <Check className="h-4 w-4 mr-2" />
              {message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-2">
              Product Name
            </label>
            <input
              type="text"
              id="product_name"
              name="product_name"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Rice, Coke, Bread"
              value={formData.product_name}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                required
                min="1"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., 10"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price per Unit
              </label>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0.01"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., 2.50"
                value={formData.price}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="sale_date" className="block text-sm font-medium text-gray-700 mb-2">
              Sale Date
            </label>
            <input
              type="date"
              id="sale_date"
              name="sale_date"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={formData.sale_date}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              Total: ${(parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2) || '0.00'}
            </div>
            <button
              type="submit"
              disabled={isLoading || !formData.product_name || !formData.quantity || !formData.price}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Sale
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
