import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Award,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>ExamPYQs</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              Admin Portal
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        {/* Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-950 border border-indigo-800 text-indigo-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Exam: BPSC TRE Computer Science</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Master Previous Year Questions with Deep Concept Understanding
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Practice authentic official PYQs. Get immediate option-wise explanations, track accuracy, and target weak topics with maximum efficiency.
          </p>
        </div>

        {/* Core Modes Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Learning Mode Card */}
          <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all shadow-sm hover:shadow-indigo-500/5 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-semibold rounded-full">
                  Recommended
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  1. Learning Mode
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Question-by-question interactive practice. Submit answer $\rightarrow$ view immediate feedback $\rightarrow$ read option-wise explanations $\rightarrow$ continue smoothly.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Immediate correct/incorrect response</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Comprehensive option A, B, C, D explanations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant progress counter & accuracy tracking</span>
                </li>
              </ul>
            </div>

            <Link
              href="/learn/bpsc-tre-cs"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
            >
              <span>Start Learning Mode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Test Mode Card */}
          <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold rounded-full">
                  CBT Environment
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  2. Full Test Mode
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Real Computer-Based Test experience with exam countdown timer, question palette, mark for review, and full score analysis at completion.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Timed exam simulation with palette navigation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Negative marking evaluation logic</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Detailed scorecard & question review</span>
                </li>
              </ul>
            </div>

            <Link
              href="/test/bpsc-tre-cs"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm rounded-xl transition-colors"
            >
              <span>Launch CBT Test Mode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Product Distinction Highlight */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Strict Content Authenticity Distinction</span>
              <p className="text-slate-400 mt-0.5">
                Official source-backed PYQs are clearly labeled with source paper details. AI-generated practice questions are strictly marked as AI Practice.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">Official PYQ</span>
            <span className="px-2.5 py-1 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono">AI Practice</span>
          </div>
        </div>
      </main>

      {/* Simple Clean Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>ExamPYQs — Serious Competitive Exam Preparation • Designed Mobile-First</p>
      </footer>
    </div>
  );
}
