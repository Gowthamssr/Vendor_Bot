'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, BarChart3, TrendingUp, Database, FileText, Menu, X, Maximize2, Minimize2 } from 'lucide-react'
import ChatInterface from '@/components/ChatInterface'
import DataEntryForm from '@/components/DataEntryForm'
import NaturalLanguageEntry from '@/components/NaturalLanguageEntry'
import ExcelUpload from '@/components/ExcelUpload'
import OcrUpload from '@/components/OcrUpload'

interface User {
  id: string
  name: string
  email: string
}

type TabId = 'chat' | 'form' | 'natural' | 'excel' | 'ocr'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatMaximized, setIsChatMaximized] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          router.push('/login')
        }
      } catch (error) {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const tabs = [
    {
      id: 'chat',
      name: 'AI Assistant',
      icon: BarChart3,
      description: 'Ask questions about your sales data'
    },
    {
      id: 'form',
      name: 'Manual Entry',
      icon: FileText,
      description: 'Add sales records manually'
    },
    {
      id: 'natural',
      name: 'Natural Language',
      icon: TrendingUp,
      description: 'Describe sales in plain English'
    },
    {
      id: 'excel',
      name: 'Bulk Upload',
      icon: Database,
      description: 'Upload Excel files with sales data'
    },
    {
      id: 'ocr',
      name: 'OCR Upload',
      icon: FileText,
      description: 'Scan invoice (PDF/Image) via OCR'
    }
  ]

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
        <div className="w-full mx-auto px-2 sm:px-3 lg:px-0">
          <div className="flex justify-between items-center py-4 sm:py-6">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl shadow-lg">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                  Sales Intelligence Hub
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium hidden sm:block">Empowering your business insights</p>
              </div>
            </div>
            
            {/* Desktop User Info and Logout */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200/60">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-800">{user.name}</p>
                  <p className="text-slate-500">{user.email}</p>
                </div>
              </div>
              
              <a
                href="/reports"
                className="flex items-center space-x-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200/60 hover:border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200/60 hover:border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="text-sm text-slate-600">
                <p className="font-medium">{user.name}</p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200/60"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-slate-700" />
                ) : (
                  <Menu className="h-5 w-5 text-slate-700" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200/60">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-200/60">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">{user.name}</p>
                    <p className="text-slate-500">{user.email}</p>
                  </div>
                </div>
                <a
                  href="/reports"
                  className="flex items-center justify-center space-x-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200/60 hover:border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center space-x-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200/60 hover:border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md w-full"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Sidebar + Content */}
      <div className="flex-1 w-full px-0 py-2 max-w-none overflow-hidden">
        {/* Mobile sidebar toggle (hamburger) */}
        <div className="mb-2 lg:hidden flex justify-start px-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle menu"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200/60 text-slate-700 shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="relative lg:flex lg:space-x-6 h-full px-2">
          {/* Sidebar */}
          {/* Mobile Drawer */}
          {isSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-30 flex">
              <div className="w-3/4 max-w-xs h-full bg-white/90 backdrop-blur-sm border-r border-slate-200/60 shadow-xl p-3">
                <nav className="flex flex-col gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as TabId); setIsSidebarOpen(false) }}
                        className={`flex items-center justify-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive ? 'bg-white text-slate-800 shadow border border-slate-200/60' : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-slate-700' : 'text-slate-500'}`} />
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">{tab.name}</span>
                          <span className="text-xs opacity-75">{tab.description}</span>
                        </div>
                      </button>
                    )})}
                </nav>
              </div>
              <button aria-label="Close menu" onClick={() => setIsSidebarOpen(false)} className="flex-1 h-full bg-black/30" />
            </div>
          )}

          {/* Desktop Sidebar */}
          <aside className={`hidden lg:block lg:w-1/5 bg-white/60 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-xl p-2 lg:p-3 h-full`}>
            <nav className="flex lg:flex-col gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); if (isSidebarOpen) setIsSidebarOpen(false) }}
                    className={`flex items-center justify-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'bg-white text-slate-800 shadow border border-slate-200/60' : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-slate-700' : 'text-slate-500'}`} />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{tab.name}</span>
                      <span className="text-xs opacity-75 hidden xl:block">{tab.description}</span>
                    </div>
                  </button>
                )})}
            </nav>
          </aside>

          {/* Content Area */}
          <section className="lg:w-4/5 w-full h-full overflow-hidden">
            <div className={`h-full ${
              activeTab === 'chat'
                ? 'bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8'
                : 'bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-6'
            }`}>
              {activeTab === 'chat' && (
                <div className="relative h-full">
                  {/* Maximize/Minimize Button - Only show on laptop and larger screens */}
                  <div className="hidden lg:block absolute top-0 right-0 z-10">
                    <button
                      onClick={() => setIsChatMaximized(!isChatMaximized)}
                      className="flex items-center space-x-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200/60 hover:border-slate-300 text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {isChatMaximized ? (
                        <>
                          <Minimize2 className="h-4 w-4" />
                          <span>Minimize</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4" />
                          <span>Maximize</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="h-full overflow-y-auto scrollbar-none-mobile">
                    <ChatInterface isMaximized={isChatMaximized} />
                  </div>
                </div>
              )}
              {activeTab === 'form' && <DataEntryForm />}
              {activeTab === 'natural' && <NaturalLanguageEntry />}
              {activeTab === 'excel' && <ExcelUpload />}
              {activeTab === 'ocr' && <OcrUpload />}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
