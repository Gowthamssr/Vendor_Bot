'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, BarChart3, TrendingUp, Database, FileText, Menu, X, Maximize2, Minimize2 } from 'lucide-react'
import ChatInterface from '@/components/ChatInterface'
import DataEntryForm from '@/components/DataEntryForm'
import NaturalLanguageEntry from '@/components/NaturalLanguageEntry'
import ExcelUpload from '@/components/ExcelUpload'

interface User {
  id: string
  name: string
  email: string
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'form' | 'natural' | 'excel'>('chat')
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatMaximized, setIsChatMaximized] = useState(false)

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
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center space-x-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200/60 hover:border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 ${
        isChatMaximized && activeTab === 'chat' ? 'max-w-none' : 'max-w-7xl'
      }`}>
        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl p-1 sm:p-2 border border-slate-200/60 shadow-sm">
            <nav className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex flex-col items-center space-y-1 sm:space-y-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-800 shadow-md border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                    }`}
                  >
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      activeTab === tab.id ? 'text-slate-700' : 'text-slate-500'
                    }`} />
                    <span className="font-semibold text-center">{tab.name}</span>
                    <span className="text-xs opacity-75 hidden lg:block text-center">{tab.description}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className={`${
          activeTab === 'chat' 
            ? 'lg:max-w-none lg:w-full' 
            : 'max-w-4xl mx-auto'
        }`}>
          <div className={`${
            activeTab === 'chat'
              ? 'bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8'
              : 'bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-6'
          }`}>
            {activeTab === 'chat' && (
              <div className="relative">
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
                <ChatInterface isMaximized={isChatMaximized} />
              </div>
            )}
            {activeTab === 'form' && <DataEntryForm />}
            {activeTab === 'natural' && <NaturalLanguageEntry />}
            {activeTab === 'excel' && <ExcelUpload />}
          </div>
        </div>
      </div>
    </div>
  )
}
