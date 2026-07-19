"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useMounted } from "@/lib/useMounted"

export default function ThemeToggle() {
  const mounted = useMounted()
  const { theme, setTheme } = useTheme()

  // Prevent hydration mismatch
  if (!mounted) return null

  return (
    <button
      aria-label="Toggle Dark Mode"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}