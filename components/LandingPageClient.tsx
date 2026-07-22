"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2, ShieldCheck, TrendingUp, Receipt,
  ArrowRight, CheckCircle2, Lock, Sparkles, ChevronDown, Users,
} from "lucide-react"
import { useMounted } from "@/lib/useMounted"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import TrustRibbon from "@/components/somiti/TrustRibbon"

/** Landing-page content item rendered in the facilities/projects/etc. lists. */
interface LandingContentItem {
  title?: string
  name?: string
  role?: string
  status?: string
  date?: string
  description?: string
  bio?: string
  photoUrl?: string
  icon?: string
}

/** Shape of the SiteContent document consumed by the landing page. */
export interface LandingContent {
  heroTitle?: string
  heroSubtitle?: string
  aboutTitle?: string
  aboutContent?: string
  visionTitle?: string
  visionContent?: string
  transparency?: string
  facilities?: LandingContentItem[]
  management?: LandingContentItem[]
  projects?: LandingContentItem[]
  activities?: LandingContentItem[]
}

// Staggered reveal variants — kept subtle (≤2 micro-interactions per screen).
const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
}

function ThemeButton() {
  const mounted = useMounted()
  const { theme, setTheme } = useTheme()
  if (!mounted) return null
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-secondary-ink transition-colors hover:bg-subtle hover:text-primary-ink"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

export default function LandingPageClient({ content }: { content: LandingContent }) {
  return (
    <div className="relative min-h-screen bg-base text-primary-ink transition-colors duration-300">
      <TrustRibbon />

      {/* ─── Navbar ─── */}
      <header className="glass sticky top-0 z-50 w-full">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient text-white shadow-brand-glow transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="t-h3 text-primary-ink">Future Savings</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#about" className="t-body font-medium text-secondary-ink transition-colors hover:text-primary-ink">About</Link>
            <Link href="#management" className="t-body font-medium text-secondary-ink transition-colors hover:text-primary-ink">Management</Link>
            <Link href="#activities" className="t-body font-medium text-secondary-ink transition-colors hover:text-primary-ink">Activities</Link>
            <Link href="/policy" className="t-body font-medium text-secondary-ink transition-colors hover:text-primary-ink">Policy</Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeButton />

            {/* Desktop auth buttons */}
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login"><Button variant="ghost" className="t-body font-medium">Login</Button></Link>
              <Link href="/register">
                <Button className="brand-gradient shadow-brand-glow t-body font-medium">
                  Register <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile dropdown */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="brand-gradient inline-flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-3 text-sm font-medium text-white shadow-brand-glow outline-none">
                  Get Started <ChevronDown className="ml-1 h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="p-0">
                    <Link href="/login" className="flex w-full cursor-pointer items-center p-2">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link href="/register" className="flex w-full cursor-pointer items-center p-2">Register</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Ambient brand glows */}
        <div className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-[0.05]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand opacity-[0.12] blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-gold opacity-[0.07] blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-base)] bg-surface px-4 py-1.5 t-body font-medium text-brand shadow-sm">
              <Sparkles className="h-4 w-4" /> Next-Gen Cooperative Management
            </div>
            <h1 className="t-display-xl text-primary-ink">
              {content.heroTitle}
            </h1>
            {content.heroSubtitle && (
              <div className="prose mt-6 max-w-none text-lg leading-relaxed text-secondary-ink dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.heroSubtitle }} />
            )}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="brand-gradient h-12 px-8 text-base shadow-brand-glow">
                  Become a Member <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#about">
                <Button size="lg" variant="outline" className="h-12 bg-surface px-8 text-base shadow-sm">Learn More</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── About & Vision ─── */}
      <section id="about" className="relative py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="t-overline mb-3 text-brand">About Us</p>
            <h2 className="t-display mb-6 text-primary-ink">{content.aboutTitle}</h2>
            {content.aboutContent && (
              <div className="prose mb-8 max-w-none text-lg leading-relaxed text-secondary-ink dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.aboutContent }} />
            )}
            <div className="card-premium flex items-start gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h3 className="t-h3 mb-2 text-primary-ink">{content.visionTitle}</h3>
                {content.visionContent && (
                  <div className="prose max-w-none text-secondary-ink dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.visionContent }} />
                )}
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
            {(content.facilities ?? []).map((fac, i) => (
              <div key={i} className="card-premium card-premium-hover h-full overflow-hidden p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="t-h3 mb-2 text-primary-ink">{fac.title}</h4>
                {fac.description && (
                  <div className="prose max-w-none t-body text-muted-ink dark:prose-invert" dangerouslySetInnerHTML={{ __html: fac.description }} />
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Transparency band ─── */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 brand-gradient" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]" />
        <motion.div
          className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mb-6 inline-block rounded-full bg-white/20 p-3 backdrop-blur-md">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="t-display mb-6 text-white">Transparency &amp; Reporting</h2>
          {content.transparency && (
            <div className="prose-invert prose max-w-none text-lg text-white/90" dangerouslySetInnerHTML={{ __html: content.transparency }} />
          )}
        </motion.div>
      </section>

      {/* ─── Management Committee ─── */}
      <section id="management" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-16 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <p className="t-overline mb-3 text-brand">Leadership</p>
            <h2 className="t-display mb-4 text-primary-ink">Our Management Committee</h2>
            <p className="t-body-lg text-muted-ink">Dedicated leaders working for the betterment of our community.</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {(content.management ?? []).map((member, i) => (
              <motion.div key={i} variants={item} className="w-full">
                <div className="card-premium card-premium-hover h-full overflow-hidden p-8 text-center">
                  <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-subtle shadow-md ring-4 ring-[var(--glass-border)]">
                    {member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-12 w-12 text-faint-ink" />
                    )}
                  </div>
                  <h3 className="t-h3 text-primary-ink">{member.name}</h3>
                  <p className="t-body mt-1 mb-4 font-medium text-brand">{member.role}</p>
                  {member.bio && (
                    <div className="prose max-w-none text-left t-body text-muted-ink dark:prose-invert" dangerouslySetInnerHTML={{ __html: member.bio }} />
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Projects & Activities ─── */}
      <section id="activities" className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-16 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <p className="t-overline mb-3 text-brand">Community</p>
            <h2 className="t-display mb-4 text-primary-ink">Our Activities &amp; Projects</h2>
            <p className="t-body-lg text-muted-ink">See what we are doing to grow our community&apos;s wealth and well-being.</p>
          </motion.div>

          <div className="grid gap-16 lg:grid-cols-2">
            {/* Projects */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h3 className="t-h2 mb-8 flex items-center gap-3 text-primary-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand"><TrendingUp className="h-5 w-5" /></span>
                Ongoing Projects
              </h3>
              <div className="space-y-6">
                {(content.projects ?? []).map((proj, i) => (
                  <div key={i} className="card-premium card-premium-hover overflow-hidden p-6">
                    <div className="flex flex-col gap-6 sm:flex-row">
                      {proj.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={proj.photoUrl} alt={proj.title} className="h-28 w-full rounded-xl object-cover shadow-sm sm:w-28" />
                      )}
                      <div className="flex-1">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="t-h3 text-primary-ink">{proj.title}</h4>
                          {proj.status && (
                            <span className="rounded-full bg-brand-gradient-soft px-3 py-1 t-caption font-bold text-brand">{proj.status}</span>
                          )}
                        </div>
                        {proj.description && (
                          <div className="prose max-w-none t-body text-muted-ink dark:prose-invert" dangerouslySetInnerHTML={{ __html: proj.description }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activities */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h3 className="t-h2 mb-8 flex items-center gap-3 text-primary-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success"><Receipt className="h-5 w-5" /></span>
                Recent Activities
              </h3>
              <div className="space-y-6">
                {(content.activities ?? []).map((act, i) => (
                  <div key={i} className="card-premium card-premium-hover overflow-hidden p-6">
                    <div className="flex flex-col gap-6 sm:flex-row">
                      {act.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={act.photoUrl} alt={act.title} className="h-28 w-full rounded-xl object-cover shadow-sm sm:w-28" />
                      )}
                      <div className="flex-1">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="t-h3 text-primary-ink">{act.title}</h4>
                          {act.date && <span className="rounded-full bg-subtle px-3 py-1 t-caption font-medium text-muted-ink">{act.date}</span>}
                        </div>
                        {act.description && (
                          <div className="prose max-w-none t-body text-muted-ink dark:prose-invert" dangerouslySetInnerHTML={{ __html: act.description }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] brand-gradient p-12 text-center shadow-pop md:p-16"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 h-full w-full opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_60%)]" />
            <h2 className="relative z-10 t-display text-white">Ready to join our community?</h2>
            <p className="relative z-10 mx-auto mt-4 max-w-2xl t-body-lg text-white/90">
              Register your account today and become part of a growing, transparent, and secure financial family.
            </p>
            <Link href="/register" className="relative z-10 mt-10 inline-block">
              <Button size="lg" variant="secondary" className="h-12 bg-white px-10 text-base text-brand shadow-lg hover:bg-white/90">
                Register Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[var(--border-base)] bg-surface py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="t-subheading text-primary-ink">Future Savings Foundation</span>
          </div>
          <p className="t-caption text-muted-ink">© {new Date().getFullYear()} Future Savings Foundation. All rights reserved.</p>
          <div className="flex gap-6 t-caption text-muted-ink">
            <Link href="/login" className="hover:text-primary-ink">Login</Link>
            <Link href="/register" className="hover:text-primary-ink">Register</Link>
            <Link href="/policy" className="hover:text-primary-ink">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
