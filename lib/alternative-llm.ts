// Alternative LLM implementations for when Gemini is rate limited

export interface LLMResponse {
  text: string
  success: boolean
  error?: string
}

// Option 1: Hugging Face Inference API (Free tier available)
export async function useHuggingFaceAPI(prompt: string): Promise<LLMResponse> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      text: data[0]?.generated_text || "No response generated",
      success: true
    }
  } catch (error) {
    return {
      text: "Sorry, I'm having trouble processing your request.",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Option 2: Simple rule-based responses (no API needed)
export function generateSimpleResponse(question: string, salesData: any[]): LLMResponse {
  const lowerQuestion = question.toLowerCase()
  
  // Calculate basic statistics
  const totalSales = salesData.reduce((sum, sale) => sum + (sale.quantity * sale.price), 0)
  const totalQuantity = salesData.reduce((sum, sale) => sum + sale.quantity, 0)
  const productCount = salesData.length
  
  // Simple keyword matching
  if (lowerQuestion.includes('total') && lowerQuestion.includes('sales')) {
    return {
      text: `Your total sales amount is $${totalSales.toFixed(2)} from ${productCount} transactions.`,
      success: true
    }
  }
  
  if (lowerQuestion.includes('quantity') || lowerQuestion.includes('how many')) {
    return {
      text: `You sold a total of ${totalQuantity} units across all products.`,
      success: true
    }
  }
  
  if (lowerQuestion.includes('product') && lowerQuestion.includes('most')) {
    const productStats = salesData.reduce((acc, sale) => {
      acc[sale.product_name] = (acc[sale.product_name] || 0) + sale.quantity
      return acc
    }, {} as Record<string, number>)
    
    const topProduct = Object.entries(productStats)
      .sort(([,a], [,b]) => b - a)[0]
    
    return {
      text: `Your best-selling product is ${topProduct[0]} with ${topProduct[1]} units sold.`,
      success: true
    }
  }
  
  // Default response
  return {
    text: `I found ${productCount} sales records with a total value of $${totalSales.toFixed(2)}. What specific information would you like to know about your sales?`,
    success: true
  }
}

// Option 3: Local LLM with Ollama (if installed)
export async function useOllama(prompt: string): Promise<LLMResponse> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama2',
        prompt: prompt,
        stream: false
      }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      text: data.response || "No response generated",
      success: true
    }
  } catch (error) {
    return {
      text: "Ollama is not available. Please install Ollama or use another LLM service.",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
