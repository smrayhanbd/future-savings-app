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
      <head>
        {/* Anti-FOUC theme init. Rendered server-side in <head> so next-themes
            does not need to emit a <script> from the client component tree
            (which React 19 flags as "Encountered a script tag"). Mirrors the
            inline script next-themes would otherwise inject. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';var m=document.documentElement;var d=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;m.classList.remove('light','dark');m.classList.add(d);m.style.colorScheme=d;}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
