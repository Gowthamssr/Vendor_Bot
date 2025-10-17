import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/lib/auth'
import { createSale } from '@/lib/sales'
import { parseToYMD } from '@/lib/date'
import { GoogleGenerativeAI } from '@google/generative-ai'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
]

const ocrItemSchema = z.object({
  product_name: z.string().min(1),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  sale_date: z.string().optional().nullable()
})

const ocrResponseSchema = z.array(ocrItemSchema).min(1)

function getGenAI(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2
  if (!key) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenerativeAI(key)
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    const userPrompt = (form.get('prompt') as string | null)?.toString().trim() || ''

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const systemPrompt = `
You are an expert invoice parser.
Extract line items from the provided invoice image/PDF.
Return ONLY a JSON array, no code fences, matching this TypeScript type exactly:

type Item = {
  product_name: string; // item/description name
  quantity: number;     // integer or decimal quantity
  price: number;        // unit price (not total line price)
  sale_date?: string;   // try to infer as YYYY-MM-DD; if absent leave empty
}

Rules:
- If the document shows dates in any format (e.g. dd-mm-yyyy, mm/dd/yyyy), normalize to YYYY-MM-DD.
- Do not include totals, taxes, shipping as items.
- If quantity is missing, default to 1.
- If unit price is missing but total and quantity are present, compute unit price = total / quantity.
- Do not include any text outside the JSON array.
${userPrompt ? `\nUser context: ${userPrompt}\n` : ''}
`

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [
          { inlineData: { mimeType: file.type, data: base64 } },
          { text: systemPrompt }
        ]}
      ]
    })

    const response = await result.response
    const text = response.text().trim()

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'Could not parse invoice content' }, { status: 400 })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ success: false, error: 'Model returned invalid JSON' }, { status: 400 })
    }

    const items = ocrResponseSchema.parse(parsed)

    // Normalize dates to YYYY-MM-DD and insert
    const createdIds: string[] = []
    const createdItems: Array<{ id: string; product_name: string; quantity: number; price: number; sale_date: string }> = []
    for (const item of items) {
      const ymd = parseToYMD(item.sale_date ?? '') || new Date().toISOString().split('T')[0]
      const sale = await createSale(
        decoded.userId,
        item.product_name,
        Number(item.quantity),
        Number(item.price),
        ymd
      )
      createdIds.push(sale.id)
      createdItems.push({
        id: sale.id,
        product_name: sale.product_name,
        quantity: sale.quantity,
        price: sale.price,
        sale_date: sale.sale_date
      })
    }

    return NextResponse.json({ success: true, count: createdIds.length, sale_ids: createdIds, items: createdItems })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 })
    }
    console.error('OCR upload error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process invoice' }, { status: 500 })
  }
}


