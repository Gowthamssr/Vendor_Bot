import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Better font loading
  variable: '--font-inter',
})

// Base URL for canonical URLs
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Vendor Sales & Insights Platform',
    template: '%s | Vendor Sales Platform',
  },
  description: 'Track, manage, and gain insights from your sales data with AI-powered analytics and reporting tools. Featuring an intelligent transaction insights chatbot for real-time data analysis.',
  keywords: [
    'sales analytics', 
    'vendor management', 
    'AI insights', 
    'business intelligence', 
    'data visualization',
    'chatbot',
    'transaction insights chatbot',
    'AI chatbot',
    'sales bot',
    'data analysis bot',
    'gowthamssr bot',
    'vendor analytics',
    'AI sales assistant',
    'conversational analytics',
    'smart business insights'
  ],
  authors: [{ name: 'Your Company' }],
  creator: 'Your Company',
  publisher: 'Your Company',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    title: 'Vendor Sales & AI Insights Platform',
    description: 'AI-powered sales analytics with intelligent transaction insights chatbot for real-time data analysis',
    siteName: 'Vendor Sales & Insights Platform',
    images: [
      {
        url: '/og-image.jpg', // Replace with your OpenGraph image
        width: 1200,
        height: 630,
        alt: 'Vendor Sales Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vendor Sales & AI Insights Platform',
    description: 'AI-powered sales analytics with intelligent transaction insights chatbot for real-time data analysis',
    images: ['/twitter-image.jpg'], // Replace with your Twitter image
    creator: '@yourhandle',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#ffffff',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/images/hero-bg.jpg" as="image" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Vendor Sales Platform',
              url: baseUrl,
              potentialAction: {
                '@type': 'SearchAction',
                target: `${baseUrl}/search?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
        {children}
      </body>
    </html>
  )
}
