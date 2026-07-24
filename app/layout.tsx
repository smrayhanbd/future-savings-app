import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import Providers from "@/components/Providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Somiti MS — Savings Cooperative Management",
  description: "Enterprise-grade management for Savings Societies and Cooperatives",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        {/* Anti-FOUC theme init is handled by next-themes' ThemeProvider
            (in components/Providers), which injects its own synchronous
            inline script into the server-rendered HTML. That built-in script
            sets the theme class before first paint, so no manual <Script>
            is needed here. Avoiding next/script in the layout also clears
            the React 19 "Encountered a script tag" warning. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
