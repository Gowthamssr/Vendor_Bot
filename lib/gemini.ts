import { GoogleGenerativeAI } from '@google/generative-ai'
import { getTodayYmdInTimeZone } from './date'
//import node env


// Support multiple API keys for fallback
const getApiKey = (): string => {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    // process.env.GEMINI_API_KEY_3
  ].filter(key => key && key.trim() !== '') as string[]

  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured. Please add at least one GEMINI_API_KEY to your environment variables.')
  }

  // Simple round-robin for now, could be enhanced with key health tracking
  return keys[Math.floor(Math.random() * keys.length)]
}

const createGenAI = () => {
  const apiKey = getApiKey()
  return new GoogleGenerativeAI(apiKey)
}

export interface ExtractedSaleData {
  product_name: string
  quantity: number
  price: number
  sale_date: string
}

export async function extractSaleDataFromText(text: string): Promise<ExtractedSaleData | null> {
  try {
    const genAI = createGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const tz = 'Asia/Kolkata'
    const todayYmd = getTodayYmdInTimeZone(tz)

    const prompt = `
    Today is ${todayYmd}.
    Extract sales data from the following text and return it as a JSON object with these exact fields:
    - product_name: string (the name of the product)
    - quantity: number (how many units were sold)
    - price: number (price per unit)
    - sale_date: string (date in YYYY-MM-DD format)

    DATE RULES:
    - Interpret relative terms (e.g., today, yesterday, tomorrow, last Monday, 2 days ago) relative to TODAY (${todayYmd}) in the Asia/Kolkata timezone.
    - If no date is provided, use TODAY (${todayYmd}).
    - Always output sale_date as a concrete YYYY-MM-DD (no words).

    Text: "${text}"

    Return only the JSON object, no additional text.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const textResponse = response.text()

    // Try to parse the JSON response
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return null
  } catch (error) {
    console.error('Error extracting sale data:', error)
    return null
  }
}

export async function generateSalesInsight(question: string, salesData: any[], conversationHistory: string[] = []): Promise<string> {
  try {
    const genAI = createGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const tz = 'Asia/Kolkata'
    const todayYmd = getTodayYmdInTimeZone(tz)

    // Build context from conversation history
    const context = conversationHistory.length > 0
      ? `\n\nPrevious conversation context:\n${conversationHistory.slice(-4).join('\n')}`
      : ''

    const prompt = `
    You are a helpful and friendly sales analytics assistant. A vendor is asking about their sales data.
    
    TODAY (in Asia/Kolkata): ${todayYmd}
    TIMEZONE: Asia/Kolkata
    
    Current Question: "${question}"
    ${context}
    
    Sales Data: ${JSON.stringify(salesData, null, 2)}
    
    DEBUG: Please carefully examine the sales data above. For each sale record, the 'price' field is the unit price, and total revenue = quantity × price.
    
    CRITICAL DATA USAGE RULES:
    1. Each sale record now includes pre-calculated fields:
       - 'unit_price' or 'price_per_unit' = price per single unit
       - 'total_revenue' = already calculated (quantity × unit_price)
    2. For sales questions, use the 'total_revenue' field directly
    3. For unit price questions, use the 'unit_price' or 'price_per_unit' field
    4. Total revenue for multiple sales = sum of all 'total_revenue' fields
    5. DO NOT calculate manually - use the pre-calculated 'total_revenue' field
    
    PRICING RESPONSE RULES (VERY IMPORTANT):
    1. If user asks for "per unit", "unit price", "price each", "individual price", "each price" → use 'unit_price' or 'price_per_unit' field
    2. If user asks for "total", "whole price", "total amount", "total cost", "full price", "complete price", "overall", "sales" → use 'total_revenue' field
    3. If user asks for "price" without specifying unit/total → show both: "Unit price: ₹X, Total: ₹Y"
    4. For revenue calculations and sales analysis, always use the 'total_revenue' field
    5. When showing pricing info, be clear about what you're showing (unit vs total)
    6. ALWAYS show total revenue amounts using the 'total_revenue' field
    
    CRITICAL FIELD USAGE:
    - Use 'total_revenue' field for all sales/revenue questions (this is pre-calculated)
    - Use 'unit_price' or 'price_per_unit' field for unit price questions
    - DO NOT calculate manually - the totals are already calculated for you
    
    SALES BREAKDOWN RULES:
    1. When user asks for "overall sales", "total sales", "sales today" → show total revenue (quantity × price) for each product
    2. When showing multiple products, clearly indicate these are TOTAL amounts, not per-unit
    3. Always clarify "total revenue" vs "unit price" in responses
    4. Use phrases like "total revenue", "total amount", "overall sales" to be crystal clear
    
    Examples of pricing responses:
    - User asks "what's the per unit price of rice?" → "**Rice** unit price: **₹2.50** per unit." (show the 'price' field value)
    - User asks "what's the total price of rice?" → "**Rice** total revenue: **₹25.00** (10 units × ₹2.50 per unit)."
    - User asks "what's the price of rice?" → "**Rice** pricing: **₹2.50** per unit, **₹25.00** total revenue."
    - User asks "rice sales" or "overall rice sales" → "Your **Rice** sales: **10 units** sold for **₹25.00** total revenue."
    - User asks "sales today overall" → "Your overall sales today: **13 units** for **₹2,013.00** total revenue. Breakdown: **Rice** ₹2,000.00 total, **Coke** ₹13.00 total."
    
    EXAMPLE DATA INTERPRETATION:
    If data shows: {"product_name": "coke", "quantity": 10, "unit_price": 13.00, "total_revenue": 130.00, "sale_date": "2025-10-23"}
    - Unit price question → "**Coke** unit price: **₹13.00** per unit" (use unit_price field)
    - Total revenue question → "**Coke** total revenue: **₹130.00**" (use total_revenue field)
    - Sales question → "Your **Coke** sales: **10 units** sold for **₹130.00** total revenue" (use total_revenue field)
    
    CRITICAL: Always use the 'total_revenue' field for sales amounts - it's already calculated correctly.
    
    DATE INTERPRETATION RULES (VERY IMPORTANT):
    1. Interpret relative dates (e.g., today, yesterday, last week) relative to TODAY (${todayYmd}) in Asia/Kolkata.
    2. Use the sale_date field ONLY (format YYYY-MM-DD) for date filtering; ignore created_at timestamps.
    3. Example: If TODAY=${todayYmd}, then "yesterday" = the calendar date one day before TODAY in Asia/Kolkata.
    
    CONTEXT UNDERSTANDING RULES:
    1. When user asks "what about yesterday" or similar follow-up questions, refer to the SAME PRODUCT from the previous question
    2. If previous question was about "bread sales", then "what about yesterday" means "bread sales yesterday"
    3. If previous question was about "Coke sales", then "what about yesterday" means "Coke sales yesterday"
    4. Always maintain the product context from the most recent question
    5. If no specific product was mentioned in previous context, ask for clarification
    
    RESPONSE GUIDELINES:
    1. Be CONCISE and DIRECT - answer the specific question asked
    2. If asked about "most sold" or "highest sales" - provide both quantity AND revenue
    3. If asked about "least sold" or "lowest sales" - provide both quantity AND revenue
    4. Use **bold text** for key numbers and amounts
    5. Keep responses under 3 sentences unless specifically asked for detailed analysis
    6. Don't provide information that wasn't requested
    7. If greeting + question, briefly acknowledge greeting then answer directly
    8. ALWAYS use ₹ (rupee symbol) instead of $ for currency
    9. Use conversation context to understand follow-up questions
    10. When user asks follow-up questions, maintain the SAME PRODUCT context
    11. Apply PRICING RESPONSE RULES when users ask about prices specifically
    12. ALWAYS clarify whether showing "total revenue" or "unit price" - be explicit
    13. When showing sales breakdowns, use "total revenue" not just "revenue" to be clear
    
    Examples of good concise responses:
    - "Your **Coke** sales: **10 units** sold for **₹130.00** total revenue." (use total_revenue field)
    - "**Rice** sales: **3 units** for **₹6,000.00** total revenue." (use total_revenue field)
    - "**Rice** unit price: **₹2000.00** per unit." (use unit_price field when asked for per unit price)
    - "**Coke** unit price: **₹13.00** per unit." (use unit_price field when asked for per unit price)
    - "Your overall sales today: **13 units** for **₹6,130.00** total revenue. Breakdown: **Rice** ₹6,000.00 total revenue, **Coke** ₹130.00 total revenue." (sum of total_revenue fields)
    
    REMEMBER: Use the pre-calculated 'total_revenue' field for all sales amounts. No manual calculation needed.
    
    Provide a concise, direct answer to the specific question asked using ₹ for currency. If it's a follow-up question, maintain the product context from the previous question. Apply pricing rules based on user intent.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error: unknown) {
    console.error('Error generating insight:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's a rate limit error and try with a different key
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      try {
        console.log('Rate limit hit, trying with different API key...')
        const genAI = createGenAI() // This will use a different key
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const context = conversationHistory.length > 0
          ? `\n\nPrevious conversation context:\n${conversationHistory.slice(-4).join('\n')}`
          : ''

        const prompt = `
        You are a helpful and friendly sales analytics assistant. A vendor is asking about their sales data.
        
        Current Question: "${question}"
        ${context}
        
        Sales Data: ${JSON.stringify(salesData, null, 2)}
        
        CRITICAL DATA USAGE RULES:
        1. Each sale record includes pre-calculated fields:
           - 'unit_price' or 'price_per_unit' = price per single unit
           - 'total_revenue' = already calculated total
        2. For sales questions, use the 'total_revenue' field directly
        3. For unit price questions, use the 'unit_price' field
        4. Total revenue for multiple sales = sum of all 'total_revenue' fields
        5. DO NOT calculate manually - use the pre-calculated fields
        
        PRICING RESPONSE RULES (VERY IMPORTANT):
        1. If user asks for "per unit", "unit price", "price each", "individual price", "each price" → show the stored price value (the 'price' field) from the data
        2. If user asks for "total", "whole price", "total amount", "total cost", "full price", "complete price", "overall" → show quantity × price
        3. If user asks for "price" without specifying unit/total → show both: "Unit price: ₹X, Total: ₹Y"
        4. For revenue calculations and sales analysis, always use total (quantity × price)
        5. When showing pricing info, be clear about what you're showing (unit vs total)
        6. ALWAYS show total revenue amounts, never per-unit amounts unless specifically asked for unit prices
        7. ALWAYS clarify whether showing "total revenue" or "unit price" - be explicit
        8. The 'price' field in data IS the unit price - never confuse total revenue with unit price
        
        CONTEXT UNDERSTANDING RULES:
        1. When user asks "what about yesterday" or similar follow-up questions, refer to the SAME PRODUCT from the previous question
        2. If previous question was about "bread sales", then "what about yesterday" means "bread sales yesterday"
        3. If previous question was about "Coke sales", then "what about yesterday" means "Coke sales yesterday"
        4. Always maintain the product context from the most recent question
        5. If no specific product was mentioned in previous context, ask for clarification
        
        RESPONSE GUIDELINES:
        1. Be CONCISE and DIRECT - answer the specific question asked
        2. If asked about "most sold" or "highest sales" - provide both quantity AND revenue
        3. If asked about "least sold" or "lowest sales" - provide both quantity AND revenue
        4. Use **bold text** for key numbers and amounts
        5. Keep responses under 3 sentences unless specifically asked for detailed analysis
        6. Don't provide information that wasn't requested
        7. If greeting + question, briefly acknowledge greeting then answer directly
        8. ALWAYS use ₹ (rupee symbol) instead of $ for currency
        9. Use conversation context to understand follow-up questions
        10. When user asks follow-up questions, maintain the SAME PRODUCT context
        11. Apply PRICING RESPONSE RULES when users ask about prices specifically
        
        Provide a concise, direct answer to the specific question asked using ₹ for currency. If it's a follow-up question, maintain the product context from the previous question. Apply pricing rules based on user intent.
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
      } catch (retryError) {
        console.error('Retry also failed:', retryError)
        return "I'm sorry, I'm having trouble analyzing your sales data right now due to high usage. Please try again in a few minutes."
      }
    }

    return "I'm sorry, I'm having trouble analyzing your sales data right now. Please try again later."
  }
}
