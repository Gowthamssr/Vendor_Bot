import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createSale } from '@/lib/sales'
import { extractSaleDataFromText } from '@/lib/gemini'
import { z } from 'zod'

const naturalLanguageSchema = z.object({
  text: z.string().min(1, 'Text is required')
})

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { text } = naturalLanguageSchema.parse(body)

    // Extract structured data from natural language text
    const extractedData = await extractSaleDataFromText(text)
    
    if (!extractedData) {
      return NextResponse.json(
        { success: false, error: 'Could not extract sales data from the provided text. Please try rephrasing.' },
        { status: 400 }
      )
    }

    // Create the sale record
    const sale = await createSale(
      decoded.userId,
      extractedData.product_name,
      extractedData.quantity,
      extractedData.price,
      extractedData.sale_date
    )
    
    return NextResponse.json({
      success: true,
      sale,
      extracted_data: extractedData
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Natural language sale creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process natural language input' },
      { status: 500 }
    )
  }
}
