'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, Check, AlertCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { parseToYMD } from '@/lib/date'

interface ExcelRow {
  product_name: string
  quantity: number
  price: number
  sale_date: string
}

export default function ExcelUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [uploadedData, setUploadedData] = useState<ExcelRow[]>([])
  const [fileName, setFileName] = useState('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setMessage('')
    setUploadedData([])
    setFileName(file.name)

    try {
      const data = await parseExcelFile(file)
      setUploadedData(data)
      
      if (data.length === 0) {
        setMessage('No valid data found in the Excel file. Please check the format.')
        setMessageType('error')
        return
      }

      // Upload data to database
      await uploadToDatabase(data)
      
      setMessage(`Successfully uploaded ${data.length} sales records!`)
      setMessageType('success')
      
      // Clear the file input
      event.target.value = ''
    } catch (error) {
      console.error('Excel upload error:', error)
      setMessage('Failed to process Excel file. Please check the format and try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const parseExcelFile = (file: File): Promise<ExcelRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          // Skip header row and process data
          const rows = jsonData.slice(1) as any[][]
          const processedData: ExcelRow[] = []
          
          rows.forEach((row, index) => {
            if (row.length >= 4) {
              const [product_name, quantity, price, sale_date] = row
              
              // Validate data
              if (product_name && quantity && price && sale_date) {
                const normalizedDate = parseToYMD(sale_date)
                if (!normalizedDate) return
                
                processedData.push({
                  product_name: String(product_name).trim(),
                  quantity: parseInt(quantity) || 0,
                  price: parseFloat(price) || 0,
                  sale_date: normalizedDate
                })
              }
            }
          })
          
          resolve(processedData)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  const uploadToDatabase = async (data: ExcelRow[]) => {
    const promises = data.map(row => 
      fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(row),
      })
    )
    
    const results = await Promise.all(promises)
    const failedUploads = results.filter(result => !result.ok)
    
    if (failedUploads.length > 0) {
      throw new Error(`${failedUploads.length} records failed to upload`)
    }
  }

  const downloadTemplate = () => {
    const template = [
      ['product_name', 'quantity', 'price', 'sale_date'],
      ['Rice', 10, 2.50, '2024-01-15'],
      ['Coke', 5, 1.99, '2024-01-16'],
      ['Bread', 3, 3.50, '2024-01-17']
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Data')
    
    XLSX.writeFile(wb, 'sales_template.xlsx')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <FileSpreadsheet className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Excel Upload</h2>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">How to use:</h3>
          <p className="text-blue-800 text-sm mb-3">
            Upload an Excel file with sales data. The file should have columns: Product Name, Quantity, Price, and Sale Date.
          </p>
          <div className="text-blue-800 text-sm">
            <p className="font-medium mb-2">Required format:</p>
            <ul className="space-y-1 text-xs">
              <li>• Column A: Product Name (text)</li>
              <li>• Column B: Quantity (number)</li>
              <li>• Column C: Price Whole(number)</li>
              <li>• Column D: Sale Date (YYYY-MM-DD format)</li>
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

        <div className="space-y-4">
          {/* Download Template */}
          <div className="flex justify-center">
            <button
              onClick={downloadTemplate}
              className="flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {isLoading ? 'Processing...' : 'Upload Excel File'}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    XLSX, XLS files only
                  </span>
                </label>
                <input
                  id="excel-upload"
                  name="excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="sr-only"
                />
              </div>
            </div>
          </div>

          {/* Preview Uploaded Data */}
          {uploadedData.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Preview ({uploadedData.length} records):</h4>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.product_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.quantity}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">${row.price}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.sale_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadedData.length > 10 && (
                  <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                    Showing first 10 of {uploadedData.length} records
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
