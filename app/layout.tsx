import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rezo CRM',
  description: 'Modern sales CRM for high-performing teams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: '!bg-zinc-900 !text-white !border !border-zinc-700 !shadow-xl',
            duration: 4000,
          }}
        />
      </body>
    </html>
  )
}
