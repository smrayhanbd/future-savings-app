"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { LanguageProvider } from "@/components/somiti/LanguageProvider"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <LanguageProvider>
          {children}
          {/* Mounted once at the app root so every toast.*() call has a renderer. */}
          <Toaster position="top-center" richColors closeButton />
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
