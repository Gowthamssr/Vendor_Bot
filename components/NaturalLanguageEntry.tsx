'use client'

import { useState } from 'react'
import { MessageSquare, Send, Check, AlertCircle } from 'lucide-react'

export default function NaturalLanguageEntry() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [extractedData, setExtractedData] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setMessage('')
    setExtractedData(null)

    try {
      const response = await fetch('/api/sales/natural-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Sale recorded successfully!')
        setMessageType('success')
        setExtractedData(data.extracted_data)
        setInput('')
      } else {
        setMessage(data.error || 'Failed to process your input')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const examples = [
    "Sold 5 bags of rice at $10 each DD-MM-YY",
    "10 bottles of coke for $2.50 each on 2024-01-15",
    "3 loaves of bread at $3.99 per loaf DD-MM-YY",
    "20 apples sold at $1.25 each on January 10th"
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <MessageSquare className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Natural Language Entry</h2>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
          <p className="text-blue-800 text-sm mb-3">
            Simply describe your sale in plain English. Our AI will extract the product name, quantity, price, and date automatically.
          </p>
          <div className="text-blue-800 text-sm">
            <p className="font-medium mb-2">Examples:</p>
            <ul className="space-y-1">
              {examples.map((example, index) => (
                <li key={index} className="text-xs">• {example}</li>
              ))}
            </ul>
          </div>
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

        {extractedData && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Extracted Data:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Product:</span> {extractedData.product_name}
              </div>
              <div>
                <span className="font-medium">Quantity:</span> {extractedData.quantity}
              </div>
              <div>
                <span className="font-medium">Price:</span> ${extractedData.price}
              </div>
              <div>
                <span className="font-medium">Date:</span> {extractedData.sale_date}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="natural-input" className="block text-sm font-medium text-gray-700 mb-2">
              Describe your sale
            </label>
            <textarea
              id="natural-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Sold 5 bags of rice at $10 each today"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Record Sale
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
