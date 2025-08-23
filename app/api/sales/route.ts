import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createSale, getSalesByVendor } from '@/lib/sales'
import { extractSaleDataFromText } from '@/lib/gemini'
import { z } from 'zod'

const saleSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
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
    const { product_name, quantity, price, sale_date } = saleSchema.parse(body)

    const sale = await createSale(decoded.userId, product_name, quantity, price, sale_date)
    
    return NextResponse.json({
      success: true,
      sale
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Create sale error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    const sales = await getSalesByVendor(decoded.userId)
    
    return NextResponse.json({
      success: true,
      sales
    })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve sales' },
      { status: 500 }
    )
  }
}
