import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ActivityTracker from "../components/ActivityTracker";
import { AuthProvider } from "../components/AuthProvider";

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'CoopilotX AI - Master Every Interview',
  description: 'Enterprise-grade AI interview assistant that processes speech in real-time and delivers human-quality responses during live interviews.',
  keywords: ['AI interview', 'interview assistant', 'job interview', 'AI coaching', 'career'],
  authors: [{ name: 'CoopilotX AI' }],
  openGraph: {
    title: 'CoopilotX AI - Master Every Interview',
    description: 'Enterprise-grade AI interview assistant with real-time speech processing',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ActivityTracker />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}