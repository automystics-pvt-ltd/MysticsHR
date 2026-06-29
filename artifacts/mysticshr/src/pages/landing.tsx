import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight, Users, ShieldCheck, BarChart3, CheckCircle, Star,
  Phone, Mail, Globe, MessageCircle, Menu, X, ChevronDown, ChevronUp,
  Zap, Clock, Award, Building2, FileText, TrendingUp, UserCheck,
  Calendar, Briefcase, Lock, Linkedin, Twitter, Facebook, Instagram,
  Youtube, MapPin, MessageSquare, PlayCircle, Sparkles, HeadphonesIcon,
  ChevronRight, Layers, CreditCard, RefreshCw,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LOGO_URL = `${BASE}/logo-icon.png`;

const FEATURES = [
  {
    icon: Users,
    title: "Employee Management",
    desc: "Full employee lifecycle — hire to retire. Org charts, departments, designations, documents, and more in one unified hub.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Calendar,
    title: "Attendance & Leave",
    desc: "Automated attendance tracking with geo-fencing, biometric sync, shift management, and intelligent leave workflows.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: CreditCard,
    title: "Payroll Processing",
    desc: "One-click payroll runs with statutory compliance — PF, ESI, TDS, PT. Auto-generated payslips and GST invoices.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: TrendingUp,
    title: "Performance Management",
    desc: "Set OKRs, run appraisals, collect 360° feedback, and identify top talent — all within an intuitive workflow.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Briefcase,
    title: "Recruitment & Onboarding",
    desc: "End-to-end ATS with job postings, candidate pipelines, interview scheduling, and digital onboarding checklists.",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Real-time HR dashboards, custom reports, compliance MIS, and audit logs — data that drives decisions.",
    color: "from-sky-500 to-blue-500",
  },
];

const STATS = [
  { value: "10,000+", label: "Employees Managed" },
  { value: "500+", label: "Companies Trust Us" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "85%", label: "Reduction in HR Admin Time" },
];

const PRICING_FEATURES = {
  starter: [
    "Up to 50 Employees",
    "Core HR & Employee Management",
    "Attendance & Leave Management",
    "Basic Payroll Processing",
    "Standard Reports",
    "Email Support",
  ],
  professional: [
    "Up to 250 Employees",
    "Everything in Starter",
    "Full Payroll + Compliance",
    "Performance & Appraisals",
    "Recruitment (ATS)",
    "Advanced Analytics",
    "Multi-branch Support",
    "Priority Support",
  ],
  enterprise: [
    "Unlimited Employees",
    "Everything in Professional",
    "Custom Integrations & API",
    "Dedicated Account Manager",
    "On-premise / Private Cloud",
    "SLA-backed Support",
    "Custom Compliance Modules",
    "White-label Options",
  ],
};

const TESTIMONIALS = [
  {
    name: "Rajesh Kumar",
    title: "CTO, NexaTech Solutions",
    avatar: "RK",
    rating: 5,
    text: "MysticsHR completely transformed our HR operations. What used to take our team a full week — payroll, compliance, reports — now runs in under an hour. The UI is clean, fast, and our HR team loves it.",
    color: "from-blue-600 to-cyan-600",
  },
  {
    name: "Priya Sharma",
    title: "HR Director, GlobalSoft India",
    avatar: "PS",
    rating: 5,
    text: "The payroll automation alone saved us ₹4 lakhs per year in consultant fees. But what really impressed us was the statutory compliance handling — PF, ESI, TDS all auto-calculated and reported correctly.",
    color: "from-violet-600 to-purple-600",
  },
  {
    name: "Anand Mehta",
    title: "CEO, InnovatHub Pvt. Ltd.",
    avatar: "AM",
    rating: 5,
    text: "Onboarding new employees used to take 3 days of paperwork. With MysticsHR's digital onboarding, we bring people live in 30 minutes. The ROI was visible in the first month.",
    color: "from-emerald-600 to-teal-600",
  },
];

const FAQS = [
  {
    q: "What is MysticsHR and who is it for?",
    a: "MysticsHR is a comprehensive, cloud-based Human Resource Management System (HRMS) built for Indian companies. It's designed for businesses of all sizes — from fast-growing startups with 20 employees to enterprises with thousands — who want to streamline HR, payroll, attendance, recruitment, and compliance in a single platform.",
  },
  {
    q: "How does the free trial work?",
    a: "You get full access to all Professional tier features for 14 days — no credit card required. Up to 25 employees can be added. At the end of your trial, you can choose a plan that fits your team size. Your data is preserved and transfers seamlessly.",
  },
  {
    q: "Is my company's data secure?",
    a: "Absolutely. MysticsHR is hosted on enterprise-grade cloud infrastructure with AES-256 encryption at rest and TLS 1.3 in transit. We maintain strict role-based access controls, audit logs for every action, and regular third-party security audits. We are ISO 27001 aligned.",
  },
  {
    q: "Can I migrate from existing HR software?",
    a: "Yes. Our onboarding team assists with data migration from popular systems like Keka, Zoho People, Darwinbox, Excel sheets, and more. We provide import templates and dedicated support to ensure a smooth transition with zero data loss.",
  },
  {
    q: "Does MysticsHR support multi-branch companies?",
    a: "Yes. Multi-branch, multi-location, and multi-entity support is available in the Professional and Enterprise plans. Each branch can have its own settings, leave policies, shift patterns, and reporting hierarchies.",
  },
  {
    q: "What compliance standards does MysticsHR handle?",
    a: "MysticsHR is built for Indian statutory compliance — PF (Provident Fund), ESI, Professional Tax (state-wise), TDS, LWF, Gratuity, and Bonus Act. Reports are auto-generated in government-prescribed formats. For enterprises, we also offer custom compliance module configuration.",
  },
];

const CONTACT_ACTIONS = [
  {
    icon: Phone,
    label: "Call Us",
    desc: "Mon – Sat, 9am – 6pm IST",
    href: "tel:+918056127734",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    icon: Mail,
    label: "Email Us",
    desc: "We reply within 4 hours",
    href: "mailto:info@automystics.com",
    color: "bg-violet-600 hover:bg-violet-700",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    desc: "Instant messaging support",
    href: "https://wa.me/918056127734",
    color: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    icon: HeadphonesIcon,
    label: "Help Center",
    desc: "Docs, guides & tutorials",
    href: "#",
    color: "bg-orange-600 hover:bg-orange-700",
  },
];

const FOOTER_LINKS = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Company: ["About Us", "Blog", "Careers", "Press Kit"],
  Legal: ["Privacy Policy", "Terms & Conditions", "Cookie Policy", "GDPR"],
  Support: ["Help Center", "Documentation", "System Status", "Contact"],
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-white text-[15px] pr-4">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-sky-400 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-sky-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-slate-400 leading-relaxed text-sm">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const [contactForm, setContactForm] = useState({ name: "", email: "", company: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(
      `mailto:info@automystics.com?subject=MysticsHR Inquiry from ${contactForm.name}&body=${encodeURIComponent(
        `Name: ${contactForm.name}\nEmail: ${contactForm.email}\nCompany: ${contactForm.company}\n\nMessage:\n${contactForm.message}`
      )}`,
      "_blank"
    );
    setContactSent(true);
    setTimeout(() => setContactSent(false), 4000);
  };

  const annualDiscount = (price: number) => Math.round(price * 0.8);

  const navLinks = ["Features", "Pricing", "Testimonials", "FAQ", "Contact"];

  return (
    <div className="min-h-screen bg-[#060e1f] text-white overflow-x-hidden">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#060e1f]/95 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img src={LOGO_URL} alt="MysticsHR Logo" className="h-9 w-9 object-contain" />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg text-white tracking-wide">MysticsHR</span>
              <span className="text-[10px] text-sky-400 font-medium tracking-widest uppercase">by Automystics</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm text-slate-300 hover:text-white transition-colors font-medium"
              >
                {link}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-200 hover:text-white hover:bg-white/10 h-9">
                Sign In
              </Button>
            </Link>
            <Link href="/login?tab=signup">
              <Button className="h-9 bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg shadow-sky-500/25">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-[#0a1628] border-t border-white/10 px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-slate-300 hover:text-white transition-colors font-medium"
              >
                {link}
              </a>
            ))}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <Link href="/login">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
              <Link href="/login?tab=signup">
                <Button className="w-full bg-sky-500 hover:bg-sky-400">Get Started Free</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-sky-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-blue-700/15 rounded-full blur-[100px]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-indigo-700/15 rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <Badge className="mb-6 inline-flex items-center gap-1.5 bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 px-4 py-1.5 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            India's Most Intelligent HRMS Platform
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            HR that runs
            <span className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              at the speed of your business
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            MysticsHR unifies your entire HR stack — employees, payroll, attendance, recruitment, 
            performance, and compliance — into one blazingly fast, enterprise-grade platform built for India.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link href="/login?tab=signup">
              <Button
                size="lg"
                className="h-13 px-8 text-base font-bold bg-sky-500 hover:bg-sky-400 shadow-2xl shadow-sky-500/30 gap-2"
              >
                Start Free 14-Day Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 text-base font-semibold border-white/20 text-white hover:bg-white/10 gap-2"
              >
                <PlayCircle className="h-4 w-4 text-sky-400" />
                See it in Action
              </Button>
            </Link>
          </div>

          <p className="text-sm text-slate-500 mb-4">No credit card required · 14-day free trial · Cancel anytime</p>

          {/* Product preview card */}
          <div className="relative mx-auto max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60">
            <div className="bg-[#0d1e38] px-4 py-3 flex items-center gap-2 border-b border-white/10">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-4 text-xs text-slate-500 font-mono">mysticshr.automystics.com/dashboard</span>
            </div>
            <div className="bg-gradient-to-br from-[#0d1e38] via-[#0f2040] to-[#101525] p-8 min-h-[260px] flex flex-col gap-4">
              {/* Simulated dashboard UI */}
              <div className="flex gap-4 flex-wrap">
                {[
                  { label: "Total Employees", value: "1,247", change: "+12", color: "text-sky-400" },
                  { label: "Present Today", value: "1,184", change: "95%", color: "text-emerald-400" },
                  { label: "Payroll (This Month)", value: "₹48.2L", change: "On Track", color: "text-violet-400" },
                  { label: "Open Positions", value: "23", change: "Hiring", color: "text-orange-400" },
                ].map((stat) => (
                  <div key={stat.label} className="flex-1 min-w-[140px] bg-white/5 rounded-xl p-4 border border-white/8">
                    <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2 flex-wrap">
                <div className="flex-1 min-w-[200px] bg-white/5 rounded-xl p-4 border border-white/8 h-24">
                  <p className="text-xs text-slate-500 mb-3">Attendance Overview</p>
                  <div className="flex items-end gap-1 h-12">
                    {[70, 85, 65, 90, 78, 88, 95, 82, 91, 88, 93, 96].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-sky-600 to-sky-400 rounded-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-[200px] bg-white/5 rounded-xl p-4 border border-white/8 h-24 flex flex-col justify-between">
                  <p className="text-xs text-slate-500">Recent Activity</p>
                  <div className="space-y-1.5">
                    {["Payroll run completed ✓", "3 leave requests pending", "New hire: Karthik M."].map((item) => (
                      <p key={item} className="text-xs text-slate-400">{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ───────────────────────────────────────────────────────── */}
      <section className="py-12 border-y border-white/8 bg-white/3">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-slate-400 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-sky-500/10 text-sky-300 border-sky-500/20">Platform Features</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Everything HR, built for{" "}
              <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                modern India
              </span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              A complete HR ecosystem — not a patchwork of tools. Every module is deeply integrated, 
              fast, and built with Indian compliance at its core.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-2xl p-6 transition-all duration-300 cursor-default"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${f.color} mb-4 shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: "radial-gradient(circle at 50% 0%, rgba(14,165,233,0.05) 0%, transparent 60%)" }} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Why Choose MysticsHR ────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gradient-to-b from-white/3 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-sky-500/10 text-sky-300 border-sky-500/20">Why MysticsHR</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Built for the way Indian businesses actually work
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Most HRMS tools are imported platforms barely adapted for India. MysticsHR is built from the ground up 
                for Indian statutory compliance, regional languages, Indian payroll structures, and the nuances of managing 
                employees across India's diverse business landscape.
              </p>
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, text: "Full Indian statutory compliance — PF, ESI, PT, TDS, LWF, Gratuity" },
                  { icon: Zap, text: "5× faster than spreadsheets — automated payroll in minutes, not hours" },
                  { icon: Lock, text: "Enterprise-grade security with role-based access and full audit trails" },
                  { icon: RefreshCw, text: "Real-time sync across branches, departments, and payroll entities" },
                  { icon: Award, text: "Dedicated onboarding and data migration support — at no extra cost" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/25">
                      <Icon className="h-4 w-4 text-sky-400" />
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/login?tab=signup">
                  <Button className="bg-sky-500 hover:bg-sky-400 gap-2 shadow-lg shadow-sky-500/25">
                    Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-600/20 to-blue-600/10 rounded-3xl blur-2xl" />
              <div className="relative bg-white/4 border border-white/10 rounded-3xl p-8 space-y-4">
                {[
                  { module: "Payroll Run — June 2025", status: "Completed", statusColor: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle, value: "₹48.2 Lakhs processed" },
                  { module: "ESI Challan Generated", status: "Filed", statusColor: "text-sky-400 bg-sky-400/10", icon: FileText, value: "Form 5A — Auto-submitted" },
                  { module: "Leave Approvals Pending", status: "3 requests", statusColor: "text-amber-400 bg-amber-400/10", icon: Clock, value: "Awaiting HOD approval" },
                  { module: "New Hire Onboarding", status: "In Progress", statusColor: "text-violet-400 bg-violet-400/10", icon: UserCheck, value: "Step 4 of 7 completed" },
                  { module: "PF ECR Uploaded", status: "Done", statusColor: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle, value: "EPFO Portal synced" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.module} className="flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 rounded-xl border border-white/8 transition-colors">
                      <div className="shrink-0 p-2 bg-white/8 rounded-lg">
                        <Icon className="h-4 w-4 text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.module}</p>
                        <p className="text-xs text-slate-500">{item.value}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-sky-500/10 text-sky-300 border-sky-500/20">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg mb-8">
              No hidden fees, no per-module charges. Everything you need to run world-class HR.
            </p>
            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 bg-white/6 border border-white/10 rounded-full p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billingCycle === "monthly" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annually")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billingCycle === "annually" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                Annually
                <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="relative bg-white/3 border border-white/10 rounded-2xl p-7 flex flex-col">
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Starter</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">
                    ₹{billingCycle === "monthly" ? "2,499" : annualDiscount(2499).toLocaleString("en-IN")}
                  </span>
                  <span className="text-slate-500 mb-1.5">/month</span>
                </div>
                {billingCycle === "annually" && (
                  <p className="text-xs text-emerald-400 mb-4">Billed ₹{(annualDiscount(2499) * 12).toLocaleString("en-IN")}/year</p>
                )}
                <p className="text-slate-400 text-sm mb-6">Perfect for small businesses getting started with structured HR.</p>
              </div>
              <Link href="/login?tab=signup" className="block mb-6">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  Start Free Trial
                </Button>
              </Link>
              <ul className="space-y-3 flex-1">
                {PRICING_FEATURES.starter.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-sky-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional — Most Popular */}
            <div className="relative bg-gradient-to-b from-sky-600/20 to-blue-700/10 border border-sky-500/40 rounded-2xl p-7 flex flex-col shadow-2xl shadow-sky-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-sky-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">Most Popular</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-300 uppercase tracking-wider mb-2">Professional</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">
                    ₹{billingCycle === "monthly" ? "6,999" : annualDiscount(6999).toLocaleString("en-IN")}
                  </span>
                  <span className="text-slate-400 mb-1.5">/month</span>
                </div>
                {billingCycle === "annually" && (
                  <p className="text-xs text-emerald-400 mb-4">Billed ₹{(annualDiscount(6999) * 12).toLocaleString("en-IN")}/year</p>
                )}
                <p className="text-slate-300 text-sm mb-6">For growing companies that need the full HRMS with advanced features.</p>
              </div>
              <Link href="/login?tab=signup" className="block mb-6">
                <Button className="w-full bg-sky-500 hover:bg-sky-400 font-bold shadow-lg shadow-sky-500/25">
                  Start Free Trial <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <ul className="space-y-3 flex-1">
                {PRICING_FEATURES.professional.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                    <CheckCircle className="h-4 w-4 text-sky-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="relative bg-white/3 border border-white/10 rounded-2xl p-7 flex flex-col">
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Enterprise</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">Custom</span>
                </div>
                <p className="text-slate-400 text-sm mb-4 mt-1">Tailored pricing for your team size and requirements.</p>
                <p className="text-slate-400 text-sm mb-6">For large organisations needing custom compliance, integrations, and SLAs.</p>
              </div>
              <a href="#contact" className="block mb-6">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  Contact Sales
                </Button>
              </a>
              <ul className="space-y-3 flex-1">
                {PRICING_FEATURES.enterprise.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-sky-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            All plans include a 14-day free trial. GST applicable on all plans. Prices in INR.
          </p>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-4 bg-gradient-to-b from-white/3 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-sky-500/10 text-sky-300 border-sky-500/20">Customer Stories</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Trusted by forward-thinking HR teams
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Companies across India switched to MysticsHR and never looked back.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="relative bg-white/4 border border-white/10 rounded-2xl p-7 flex flex-col gap-5 hover:border-white/20 transition-colors"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center font-bold text-white text-sm shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-sky-500/10 text-sky-300 border-sky-500/20">FAQs</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Questions? Answered.</h2>
            <p className="text-slate-400">
              Everything you need to know before you start. Can't find your answer?{" "}
              <a href="#contact" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                Contact us
              </a>
              .
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact ─────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-4 bg-gradient-to-b from-white/3 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-sky-500/10 text-sky-300 border-sky-500/20">Get In Touch</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              We're here to help
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Whether you have a question, need a custom demo, or want to migrate from your existing system — 
              our team is ready to help you every step of the way.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left — contact info */}
            <div className="space-y-8">
              {/* Quick action buttons */}
              <div className="grid grid-cols-2 gap-4">
                {CONTACT_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={action.label}
                      href={action.href}
                      target={action.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className={`${action.color} text-white rounded-xl p-5 flex flex-col gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg`}
                    >
                      <Icon className="h-5 w-5" />
                      <p className="font-bold text-sm">{action.label}</p>
                      <p className="text-xs text-white/70">{action.desc}</p>
                    </a>
                  );
                })}
              </div>

              {/* Contact details */}
              <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="font-bold text-lg text-white">Automystics Technologies Pvt. Ltd.</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 p-2.5 bg-sky-500/15 border border-sky-500/25 rounded-lg mt-0.5">
                      <Phone className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Phone</p>
                      <a href="tel:+918056127734" className="block text-white hover:text-sky-300 transition-colors font-semibold">
                        +91 8056 12 7734
                      </a>
                      <a href="tel:+919345127734" className="block text-white hover:text-sky-300 transition-colors font-semibold">
                        +91 9345 12 7734
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="shrink-0 p-2.5 bg-violet-500/15 border border-violet-500/25 rounded-lg mt-0.5">
                      <Mail className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Email</p>
                      <a
                        href="mailto:info@automystics.com"
                        className="text-white hover:text-violet-300 transition-colors font-semibold"
                      >
                        info@automystics.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="shrink-0 p-2.5 bg-emerald-500/15 border border-emerald-500/25 rounded-lg mt-0.5">
                      <Globe className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Website</p>
                      <a
                        href="https://www.automystics.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-white hover:text-emerald-300 transition-colors font-semibold"
                      >
                        www.automystics.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Social links */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Follow Us</p>
                  <div className="flex gap-3">
                    {[
                      { icon: Linkedin, href: "https://linkedin.com/company/automystics", label: "LinkedIn", color: "hover:text-sky-400" },
                      { icon: Twitter, href: "https://twitter.com/automystics", label: "Twitter / X", color: "hover:text-slate-200" },
                      { icon: Facebook, href: "https://facebook.com/automystics", label: "Facebook", color: "hover:text-blue-400" },
                      { icon: Instagram, href: "https://instagram.com/automystics", label: "Instagram", color: "hover:text-pink-400" },
                      { icon: Youtube, href: "https://youtube.com/@automystics", label: "YouTube", color: "hover:text-red-400" },
                    ].map(({ icon: Icon, href, label, color }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        title={label}
                        className={`p-2.5 bg-white/8 hover:bg-white/15 border border-white/10 rounded-lg text-slate-400 ${color} transition-all`}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right — contact form */}
            <div className="bg-white/4 border border-white/10 rounded-2xl p-7">
              <h3 className="font-bold text-lg text-white mb-2">Send us a message</h3>
              <p className="text-slate-400 text-sm mb-6">We typically respond within 4 business hours.</p>

              {contactSent ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                  </div>
                  <p className="font-semibold text-white">Message sent!</p>
                  <p className="text-slate-400 text-sm text-center">Your email client opened with your message. We'll get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1.5">Full Name *</label>
                      <Input
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="Rajesh Kumar"
                        className="bg-white/8 border-white/15 text-white placeholder:text-slate-600 focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1.5">Business Email *</label>
                      <Input
                        required
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="you@company.com"
                        className="bg-white/8 border-white/15 text-white placeholder:text-slate-600 focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5">Company Name</label>
                    <Input
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      placeholder="Your Company Pvt. Ltd."
                      className="bg-white/8 border-white/15 text-white placeholder:text-slate-600 focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5">Message *</label>
                    <Textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Tell us about your team size, current HR challenges, or what you'd like to see in a demo..."
                      className="bg-white/8 border-white/15 text-white placeholder:text-slate-600 focus:border-sky-500 resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-400 font-bold h-11 shadow-lg shadow-sky-500/25 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Send Message
                  </Button>
                  <p className="text-xs text-slate-500 text-center">
                    By submitting, you agree to our{" "}
                    <a href="#" className="text-sky-400 hover:underline">Privacy Policy</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-600/30 via-blue-600/20 to-indigo-600/30 rounded-3xl blur-2xl" />
          <div className="relative bg-gradient-to-r from-sky-600/20 via-blue-700/15 to-indigo-700/20 border border-sky-500/25 rounded-3xl p-12 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
              Ready to transform your HR?
            </h2>
            <p className="text-slate-300 text-lg max-w-xl mx-auto mb-8">
              Join 500+ companies who've already made the switch. Start your free trial today — 
              no credit card, no commitment.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login?tab=signup">
                <Button size="lg" className="h-12 px-8 bg-sky-500 hover:bg-sky-400 font-bold text-base shadow-2xl shadow-sky-500/30 gap-2">
                  Start Free 14-Day Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-12 px-8 border-white/25 text-white hover:bg-white/10 font-semibold text-base">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 bg-[#040b18]">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-10 mb-14">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="MysticsHR" className="h-9 w-9 object-contain" />
                <div>
                  <p className="font-bold text-white text-lg leading-none">MysticsHR</p>
                  <p className="text-[10px] text-sky-400 tracking-widest uppercase">by Automystics</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-5 max-w-xs">
                India's most intelligent HRMS — built for modern businesses that demand precision, 
                compliance, and speed from their people operations.
              </p>
              <p className="text-slate-600 text-xs font-medium">Automystics Technologies Pvt. Ltd.</p>
              <div className="flex gap-2 mt-4">
                {[
                  { icon: Linkedin, href: "https://linkedin.com/company/automystics" },
                  { icon: Twitter, href: "https://twitter.com/automystics" },
                  { icon: Facebook, href: "https://facebook.com/automystics" },
                  { icon: Instagram, href: "https://instagram.com/automystics" },
                  { icon: Youtube, href: "https://youtube.com/@automystics" },
                ].map(({ icon: Icon, href }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white/6 hover:bg-white/12 border border-white/8 rounded-lg text-slate-500 hover:text-slate-300 transition-all"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">{category}</p>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Automystics Technologies Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              {["Privacy Policy", "Terms & Conditions", "Cookie Policy", "Support"].map((link) => (
                <a key={link} href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  {link}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
