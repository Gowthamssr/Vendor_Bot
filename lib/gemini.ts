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
    
    CRITICAL CALCULATION RULES:
    1. For each sale, calculate revenue as: quantity × price
    2. Total revenue = sum of all individual sale revenues
    3. Average revenue per sale = total revenue ÷ number of sales
    4. Average price per unit = total revenue ÷ total quantity sold
    
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
    
    Examples of good concise responses:
    - "Your **Coke** sales: **15 units** sold for **₹309.95** total revenue."
    - "**Bread** sold the least: **3 units** for **₹10.50** revenue."
    - "**Apples** had the highest sales: **20 units** for **₹40.00** revenue."
    - "Hi! Your **Rice** sales: **10 units** for **₹25.00** total."
    - "Yesterday's **Bread** sales: **2 units** for **₹7.00** revenue."
    
    Provide a concise, direct answer to the specific question asked using ₹ for currency. If it's a follow-up question, maintain the product context from the previous question.
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
        
        CRITICAL CALCULATION RULES:
        1. For each sale, calculate revenue as: quantity × price
        2. Total revenue = sum of all individual sale revenues
        3. Average revenue per sale = total revenue ÷ number of sales
        4. Average price per unit = total revenue ÷ total quantity sold
        
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
        
        Provide a concise, direct answer to the specific question asked using ₹ for currency. If it's a follow-up question, maintain the product context from the previous question.
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
