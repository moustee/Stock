import type { Metadata, Viewport } from "next"
import { Space_Mono, Syne } from "next/font/google"
import "./globals.css"

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
})

const syne = Syne({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-syne",
})

export const metadata: Metadata = {
  title: "APEX MKTS - Real-Time Stock Intelligence",
  description:
    "Professional-grade stock portfolio tracker with AI-powered signals, entry/hold/sell analysis, and real-time P&L tracking.",
}

export const viewport: Viewport = {
  themeColor: "#060810",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceMono.variable} ${syne.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
