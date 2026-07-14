"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Building2, ShieldCheck, TrendingUp, Wallet, Users, Receipt, 
  ArrowRight, CheckCircle2, Lock, Sun, Moon
} from "lucide-react"

// Animation Variants
const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const fadeDown = {
  hidden: { opacity: 0, y: -50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const slideLeft = {
  hidden: { opacity: 0, x: 100 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } }
}

const slideRight = {
  hidden: { opacity: 0, x: -100 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } }
}

const zoomIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
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
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Future Savings</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">About</Link>
            <Link href="#management" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Management</Link>
            <Link href="#activities" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Activities</Link>
            <Link href="/policy" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Policy</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link href="/login"><Button variant="ghost" className="text-sm font-medium hidden sm:block">Login</Button></Link>
            <Link href="/register"><Button className="bg-indigo-600 hover:bg-indigo-700 text-sm font-medium shadow-md">Register <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero Section (Fade Down) */}
      <section className="relative overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 dark:opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-200 via-transparent to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            variants={fadeDown}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
              {content.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
              {content.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-base h-12 px-8 shadow-lg">
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

      {/* About & Vision Section (Slide Right & Left) */}
      <section id="about" className="py-20 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            variants={slideRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">{content.aboutTitle}</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">{content.aboutContent}</p>
            <div className="flex items-start gap-4 p-6 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">{content.visionTitle}</h3>
                <p className="text-indigo-700 dark:text-indigo-400">{content.visionContent}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 gap-6"
            variants={slideLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {(content.facilities as any[]).map((fac, i) => (
              <Card key={i} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden h-full">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">{fac.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{fac.description}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Transparency Section (Zoom In) */}
      <section className="py-16 bg-indigo-600 dark:bg-indigo-900 text-white transition-colors duration-300">
        <motion.div 
          className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl"
          variants={zoomIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <Lock className="h-10 w-10 mx-auto mb-4 text-indigo-200" />
          <h2 className="text-3xl font-bold mb-4">Transparency & Reporting</h2>
          <p className="text-lg text-indigo-100 dark:text-indigo-200">{content.transparency}</p>
        </motion.div>
      </section>

      {/* Management Committee (Fade Up Stagger) */}
      <section id="management" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-2xl mx-auto mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Our Management Committee</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Dedicated leaders working for the betterment of our community.</p>
          </motion.div>
          
          <div className="flex flex-wrap justify-center gap-8">
            {(content.management as any[]).map((member, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.1 }}
                className="w-full sm:w-72 max-w-sm"
              >
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-shadow rounded-2xl overflow-hidden text-center h-full">
                  <CardContent className="p-8">
                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto mb-4 overflow-hidden flex items-center justify-center">
                      {member.photoUrl ? <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" /> : <Users className="h-10 w-10 text-slate-400" />}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{member.name}</h3>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-2">{member.role}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{member.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects & Activities (Slide Left & Right) */}
      <section id="activities" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-2xl mx-auto mb-16"
            variants={fadeDown}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Our Activities & Projects</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">See what we are doing to grow our community's wealth and well-being.</p>
          </motion.div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Projects List (Slide Right) */}
            <motion.div
              variants={slideRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> Ongoing Projects</h3>
              <div className="space-y-6">
                {(content.projects as any[]).map((proj, i) => (
                  <div key={i} className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {proj.photoUrl && <img src={proj.photoUrl} alt={proj.title} className="w-full sm:w-24 h-24 object-cover rounded-lg" />}
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-slate-900 dark:text-white">{proj.title}</h4>
                          <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full">{proj.status}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{proj.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activities List (Slide Left) */}
            <motion.div
              variants={slideLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Receipt className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> Recent Activities</h3>
              <div className="space-y-6">
                {(content.activities as any[]).map((act, i) => (
                  <div key={i} className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {act.photoUrl && <img src={act.photoUrl} alt={act.title} className="w-full sm:w-24 h-24 object-cover rounded-lg" />}
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-slate-900 dark:text-white">{act.title}</h4>
                          <span className="text-xs font-medium text-slate-400">{act.date}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{act.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section (Zoom In) */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-2xl"
            variants={zoomIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to join our community?</h2>
            <p className="text-indigo-100 text-lg mb-8">Register your account today and become part of a growing, transparent, and secure financial family.</p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="bg-white text-indigo-600 hover:bg-slate-100 text-base h-12 px-8">
                Register Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
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