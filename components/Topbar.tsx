"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Menu, Moon, Sun, Bell, Search, User, Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted to avoid hydration mismatch for theme
  useEffect(() => setMounted(true), [])

  return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-6 w-6" />
        </Button>
        
        {/* Search Bar */}
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search members, ID, transactions..." 
            className="pl-9 h-9 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Dark/Light Mode Toggle */}
        {mounted && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer">
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <p className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Notifications</p>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start py-2">
              <p className="text-sm font-medium">New member registered</p>
              <p className="text-xs text-slate-500">John Doe submitted an application.</p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start py-2">
              <p className="text-sm font-medium">Savings deposit received</p>
              <p className="text-xs text-slate-500">৳ 5000 added to account M0001.</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 rounded-full outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 cursor-pointer">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                {session?.user?.email?.charAt(0).toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <p className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              {session?.user?.email || "Admin"}
            </p>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="text-red-600 focus:text-red-700">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}