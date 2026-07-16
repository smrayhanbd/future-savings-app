"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Building2, ShieldCheck, TrendingUp, Wallet, Users, Receipt, 
  ArrowRight, CheckCircle2, Lock, Sun, Moon, Sparkles, ChevronDown 
} from "lucide-react"

// Premium Animation Variants
const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

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

export default function LandingPageClient({ content }: { content: any }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-300">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Future Savings</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">About</Link>
            <Link href="#management" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Management</Link>
            <Link href="#activities" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Activities</Link>
            <Link href="/policy" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Policy</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            
            {/* Desktop View (Separate Buttons) */}
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login"><Button variant="ghost" className="text-sm font-medium">Login</Button></Link>
              <Link href="/register"><Button className="bg-indigo-600 hover:bg-indigo-700 text-sm font-medium shadow-md">Register <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>

            {/* Mobile View (Dropdown Menu) */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white shadow hover:bg-indigo-700 h-9 px-3 cursor-pointer outline-none">
                  Get Started <ChevronDown className="ml-1 h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="p-0">
                    <Link href="/login" className="flex items-center w-full cursor-pointer p-2">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link href="/register" className="flex items-center w-full cursor-pointer p-2">Register</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Vibrant Indigo Glow */}
      <section className="relative overflow-hidden bg-indigo-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.2),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.3),transparent_50%)]"></div>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <motion.div 
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" /> Next-Gen Cooperative Management
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
              {content.heroTitle}
            </h1>
            <div className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content.heroSubtitle }} />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-base h-12 px-8 shadow-lg shadow-indigo-500/30">
                  Become a Member <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#about">
                <Button size="lg" variant="outline" className="text-base h-12 px-8 bg-white dark:bg-slate-800 shadow-sm">Learn More</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About & Vision Section - Clean White/Slate */}
      <section id="about" className="py-24 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">{content.aboutTitle}</h2>
            <div className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content.aboutContent }} />
            <div className="flex items-start gap-4 p-6 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 text-lg">{content.visionTitle}</h3>
                <div className="text-indigo-700 dark:text-indigo-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content.visionContent }} />
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 gap-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {(content.facilities as any[]).map((fac, i) => (
              <Card key={i} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden h-full">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">{fac.title}</h4>
                  <div className="text-sm text-slate-600 dark:text-slate-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fac.description }} />
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Transparency Section - Deep Indigo Background */}
      <section className="py-20 bg-indigo-700 dark:bg-indigo-900 text-white transition-colors duration-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
        <motion.div 
          className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-block p-3 rounded-full bg-white/20 mb-6 backdrop-blur-md">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Transparency & Reporting</h2>
          <div className="text-lg text-indigo-100 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content.transparency }} />
        </motion.div>
      </section>

      {/* Management Committee - Light Sky Blue Background */}
      <section id="management" className="py-24 bg-sky-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Our Management Committee</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Dedicated leaders working for the betterment of our community.</p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {(content.management as any[]).map((member, i) => (
              <motion.div
                key={i}
                variants={item}
                className="w-full"
              >
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden text-center h-full">
                  <CardContent className="p-8">
                    <div className="w-28 h-28 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto mb-6 overflow-hidden flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-md">
                      {member.photoUrl ? <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" /> : <Users className="h-12 w-12 text-slate-400" />}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{member.name}</h3>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-4 mt-1">{member.role}</p>
                    <div className="text-sm text-slate-500 dark:text-slate-400 prose dark:prose-invert max-w-none text-left" dangerouslySetInnerHTML={{ __html: member.bio }} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Projects & Activities - Light Violet Background */}
      <section id="activities" className="py-24 bg-violet-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Our Activities & Projects</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">See what we are doing to grow our community&apos;s wealth and well-being.</p>
          </motion.div>
          
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Projects List */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-indigo-600 dark:text-indigo-400" /> Ongoing Projects</h3>
              <div className="space-y-6">
                {(content.projects as any[]).map((proj, i) => (
                  <div key={i} className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {proj.photoUrl && <img src={proj.photoUrl} alt={proj.title} className="w-full sm:w-28 h-28 object-cover rounded-xl shadow-sm" />}
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">{proj.title}</h4>
                          <span className="text-xs font-bold px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full">{proj.status}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: proj.description }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activities List */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3"><Receipt className="h-7 w-7 text-emerald-600 dark:text-emerald-400" /> Recent Activities</h3>
              <div className="space-y-6">
                {(content.activities as any[]).map((act, i) => (
                  <div key={i} className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {act.photoUrl && <img src={act.photoUrl} alt={act.title} className="w-full sm:w-28 h-28 object-cover rounded-xl shadow-sm" />}
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">{act.title}</h4>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{act.date}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: act.description }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section - Deep Slate with Gradient Glow */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="max-w-5xl mx-auto p-12 md:p-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-2xl text-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_60%)]"></div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 relative z-10">Ready to join our community?</h2>
            <p className="text-indigo-100 text-lg md:text-xl mb-10 relative z-10 max-w-2xl mx-auto">Register your account today and become part of a growing, transparent, and secure financial family.</p>
            <Link href="/register" className="relative z-10">
              <Button size="lg" variant="secondary" className="bg-white text-indigo-600 hover:bg-slate-100 text-base h-12 px-10 shadow-lg">
                Register Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer - Clean White/Slate */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 transition-colors duration-300">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Future Savings Foundation</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} Future Savings Foundation. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white">Login</Link>
            <Link href="/register" className="hover:text-slate-900 dark:hover:text-white">Register</Link>
            <Link href="/policy" className="hover:text-slate-900 dark:hover:text-white">Privacy Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}