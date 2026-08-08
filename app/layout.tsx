import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import Providers from "@/components/Providers"
import { DEFAULT_ORG, getOrganization } from "@/lib/organization"

// The root layout's generateMetadata reads the Organization row from the DB.
// Force-dynamic (like every other segment in this app) so Next.js never tries
// to statically prerender the root / `_not-found` at BUILD time — that would
// invoke generateMetadata during `next build` and crash on any DB error.
export const dynamic = "force-dynamic"

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

// Dynamic metadata — the browser-tab title and SEO description follow the
// saved Organization identity. Falls back to the generic defaults when the
// singleton row is missing OR the DB is unreachable (e.g. a transient pool
// error), so metadata never becomes a fatal page error.
export async function generateMetadata(): Promise<Metadata> {
  let org = DEFAULT_ORG
  try {
    org = await getOrganization()
  } catch {
    // Degrade gracefully — use defaults instead of failing the response.
  }
  return {
    title: `${org.name} — Savings Cooperative Management`,
    description: org.description || "Enterprise-grade management for Savings Societies and Cooperatives",
  }
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
