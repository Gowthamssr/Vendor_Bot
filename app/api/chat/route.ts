import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getSalesByVendor } from '@/lib/sales'
import { generateSalesInsight } from '@/lib/gemini'

// Helper function to detect pure greetings (without sales content)
function isPureGreeting(text: string): boolean {
  const greetings = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'howdy', 'greetings', 'what\'s up', 'sup', 'yo', 'morning', 'afternoon',
    'evening', 'good day', 'hello there', 'hi there', 'hey there'
  ]
  const lowerText = text.toLowerCase().trim()
  
  // Check if it's just a greeting without any sales-related content
  const isGreeting = greetings.some(greeting => lowerText.includes(greeting))
  
  // If it contains sales keywords, it's not a pure greeting
  const salesKeywords = [
    'sales', 'sell', 'sold', 'revenue', 'income', 'profit', 'earnings',
    'product', 'item', 'quantity', 'amount', 'total', 'sum', 'count',
    'month', 'year', 'week', 'day', 'period', 'time', 'date',
    'best', 'worst', 'top', 'bottom', 'highest', 'lowest', 'most', 'least',
    'average', 'mean', 'median', 'trend', 'growth', 'decline', 'increase',
    'decrease', 'compare', 'versus', 'vs', 'difference', 'percentage',
    'rice', 'coke', 'bread', 'food', 'drink', 'beverage', 'snack',
    'how much', 'what is', 'show me', 'tell me', 'give me', 'find',
    'search', 'look', 'see', 'view', 'display', 'report', 'summary',
    'analysis', 'insight', 'data', 'record', 'transaction', 'purchase'
  ]
  
  const hasSalesContent = salesKeywords.some(keyword => lowerText.includes(keyword))
  
  // Only return true if it's a greeting AND has no sales content
  return isGreeting && !hasSalesContent
}

// Helper function to detect sales-related keywords
function isSalesRelated(text: string): boolean {
  const salesKeywords = [
    'sales', 'sell', 'sold', 'revenue', 'income', 'profit', 'earnings',
    'product', 'item', 'quantity', 'amount', 'total', 'sum', 'count',
    'month', 'year', 'week', 'day', 'period', 'time', 'date',
    'best', 'worst', 'top', 'bottom', 'highest', 'lowest', 'most', 'least',
    'average', 'mean', 'median', 'trend', 'growth', 'decline', 'increase',
    'decrease', 'compare', 'versus', 'vs', 'difference', 'percentage',
    'rice', 'coke', 'bread', 'food', 'drink', 'beverage', 'snack',
    'how much', 'what is', 'show me', 'tell me', 'give me', 'find',
    'search', 'look', 'see', 'view', 'display', 'report', 'summary',
    'analysis', 'insight', 'data', 'record', 'transaction', 'purchase'
  ]
  const lowerText = text.toLowerCase().trim()
  return salesKeywords.some(keyword => lowerText.includes(keyword))
}

// Helper function to generate greeting response
function generateGreetingResponse(): string {
  const greetings = [
    "Hello! 👋 I'm your AI Sales Assistant. I can help you analyze your sales data and provide insights. What would you like to know about your sales?",
    "Hi there! 😊 Welcome to your Sales Intelligence Hub. I'm here to help you understand your sales performance. Feel free to ask me anything about your sales data!",
    "Hey! 🎉 Great to see you! I'm your dedicated sales assistant. I can help you track performance, analyze trends, and get insights from your sales data. What's on your mind?",
    "Good day! 🌟 I'm here to help you make sense of your sales data. Whether you want to know about total sales, best products, or trends, just ask!",
    "Hello! ✨ Ready to dive into your sales insights? I can help you understand your performance, identify trends, and answer any questions about your sales data."
  ]
  return greetings[Math.floor(Math.random() * greetings.length)]
}

// Helper function to generate off-topic response
function generateOffTopicResponse(): string {
  const responses = [
    "I'm specifically designed to help with sales-related questions and insights. I can help you analyze your sales data, track performance, identify trends, and answer questions about your products and revenue. What would you like to know about your sales?",
    "I'm your sales assistant, so I can best help you with questions about your sales data, products, revenue, and business performance. For example, you could ask me about total sales, best-selling products, or sales trends. What sales information would you like to explore?",
    "I'm focused on helping you with sales insights and analysis. I can help you understand your sales performance, track products, analyze trends, and answer questions about your revenue. Let's focus on your sales data - what would you like to know?",
    "I'm here to help you with sales-related questions and insights. I can analyze your sales data, help you understand performance trends, and answer questions about your products and revenue. What sales information would you like to explore today?",
    "I'm your dedicated sales assistant, so I'm best equipped to help you with sales data, performance analysis, product insights, and revenue questions. What would you like to know about your sales performance?"
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { question, conversationHistory = [] } = await request.json()
    
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const trimmedQuestion = question.trim()
    
    // Handle pure greetings (greetings without sales content)
    if (isPureGreeting(trimmedQuestion)) {
      return NextResponse.json({
        response: generateGreetingResponse()
      })
    }

    // Check if question is sales-related
    if (!isSalesRelated(trimmedQuestion)) {
      return NextResponse.json({
        response: generateOffTopicResponse()
      })
    }

    // Get sales data for the vendor
    const salesData = await getSalesByVendor(decoded.userId)
    
    if (salesData.length === 0) {
      return NextResponse.json({
        response: "I don't see any sales data in your account yet. You can add sales data using the 'Manual Entry', 'Natural Language', or 'Bulk Upload' tabs, and then I'll be able to help you analyze it!"
      })
    }

    // Generate insight using Gemini API with conversation history
    const insight = await generateSalesInsight(trimmedQuestion, salesData, conversationHistory)
    
    return NextResponse.json({
      response: insight
    })

  } catch (error) {
    console.error('Error generating insight:', error)
    return NextResponse.json({
      response: "I'm sorry, I'm having trouble analyzing your sales data right now. Please try again later."
    }, { status: 500 })
  }
}
