'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface ChatInterfaceProps {
  isMaximized?: boolean
}

// Function to convert markdown-style bold text to HTML
function formatMessageText(text: string): string {
  // Convert **text** to <strong>text</strong>
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // Convert *text* to <strong>text</strong> (single asterisks)
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<strong>$1</strong>')
  return formattedText
}

export default function ChatInterface({ isMaximized = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build conversation history for context - include both user questions and bot responses
      const conversationHistory = messages
        .slice(-8) // Keep last 8 messages (4 Q&A pairs) for context
        .map(msg => `${msg.isUser ? 'User' : 'Bot'}: ${msg.text}`)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: input.trim(),
          conversationHistory: conversationHistory
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`flex flex-col h-full ${
      isMaximized ? 'max-w-none w-full' : 'max-w-4xl lg:max-w-none mx-auto'
    }`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-2 sm:mb-4 flex-shrink-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800">AI Sales Assistant</h2>
          <p className="text-sm text-slate-600">Ask me anything about your sales data (I may hallucinate sometimes)</p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 mb-3 sm:mb-4 p-2 scrollbar-hide min-h-0"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Welcome to your AI Assistant!</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              Ask me questions like "What were my total sales this month?" or "Which product sold the most?"
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 sm:space-x-3 ${
                  isMaximized 
                    ? 'max-w-[70%] xl:max-w-[60%] 2xl:max-w-[50%]' 
                    : 'max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]'
                } ${
                  message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                  message.isUser 
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}>
                  {message.isUser ? (
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  )}
                </div>
                <div
                  className={`px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-sm ${
                    message.isUser
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  <div 
                    className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: message.isUser ? message.text : formatMessageText(message.text) 
                    }}
                  />
                  <p className={`text-xs mt-2 ${
                    message.isUser ? 'text-slate-200' : 'text-slate-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className={`flex items-start space-x-3 ${
              isMaximized 
                ? 'max-w-[70%] xl:max-w-[60%] 2xl:max-w-[50%]' 
                : 'max-w-[75%] lg:max-w-[70%]'
            }`}>
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="bg-white border border-slate-200 text-slate-800 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm sm:text-base text-slate-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex space-x-2 sm:space-x-3 flex-shrink-0 pb-6 sm:pb-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your sales data..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 sm:px-5 sm:py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm text-slate-800 placeholder-slate-500 disabled:opacity-50 text-sm sm:text-base"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-3 py-2 sm:px-5 sm:py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </form>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
