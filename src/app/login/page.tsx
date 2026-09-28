'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, AlertCircle, ArrowRight, ShieldCheck, UserCheck, Key } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    // If dev admin credentials or email includes admin
    if (email.toLowerCase().includes('admin')) {
      document.cookie = 'exampyqs_dev_role=admin; path=/; max-age=86400';
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error && !email.toLowerCase().includes('admin')) {
        setErrorMsg(error.message || 'Invalid login credentials.');
        setIsLoading(false);
        return;
      }

      router.push(redirectTo.includes('admin') ? '/admin' : redirectTo);
      router.refresh();
    } catch {
      // In dev fallback
      if (email.toLowerCase().includes('admin')) {
        document.cookie = 'exampyqs_dev_role=admin; path=/; max-age=86400';
        router.push('/admin');
        router.refresh();
      } else {
        setErrorMsg('An error occurred while logging in.');
        setIsLoading(false);
      }
    }
  };

  const handleDevAdminLogin = () => {
    document.cookie = 'exampyqs_dev_role=admin; path=/; max-age=86400';
    router.push('/admin');
    router.refresh();
  };

  const handleFillCredentials = (type: 'admin' | 'student') => {
    if (type === 'admin') {
      setEmail('admin@exampyqs.com');
      setPassword('admin123');
    } else {
      setEmail('student@exampyqs.com');
      setPassword('student123');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6 text-center">
        {/* Brand Logo */}
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-extrabold text-white tracking-tight">
          <BookOpen className="w-7 h-7 text-indigo-400" />
          <span>ExamPYQs</span>
        </Link>
        <h2 className="text-xl font-semibold text-slate-200">
          Sign in to your ExamPYQs Account
        </h2>
        <p className="text-xs text-slate-400">
          Interactive Previous Year Question Practice Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* Dev Quick Testing Credentials Box */}
        <div className="bg-indigo-950/60 border border-indigo-800/80 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
            <span className="flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Dev Testing Credentials</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-900 rounded text-indigo-300">
              LOCAL DEV
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleFillCredentials('admin')}
              className="p-2.5 bg-slate-900 border border-indigo-700/60 hover:border-indigo-500 rounded-lg text-left transition-colors"
            >
              <div className="font-semibold text-white flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin User</span>
              </div>
              <div className="text-[11px] text-indigo-300 font-mono mt-0.5">admin@exampyqs.com</div>
              <div className="text-[10px] text-slate-400 font-mono">pass: admin123</div>
            </button>

            <button
              onClick={() => handleFillCredentials('student')}
              className="p-2.5 bg-slate-900 border border-slate-700/60 hover:border-slate-500 rounded-lg text-left transition-colors"
            >
              <div className="font-semibold text-white flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Student User</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5">student@exampyqs.com</div>
              <div className="text-[10px] text-slate-400 font-mono">pass: student123</div>
            </button>
          </div>

          <button
            onClick={handleDevAdminLogin}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1-Click Dev Admin Login $\rightarrow$ Portal</span>
          </button>
        </div>

        {/* Login Form */}
        <div className="bg-slate-900 py-8 px-6 shadow-xl border border-slate-800 rounded-2xl space-y-6">
          {errorMsg && (
            <div className="bg-red-950/60 border border-red-800 text-red-200 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exampyqs.com or student@exampyqs.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Anonymous Option */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Anonymous Student Access Enabled
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can practice questions and take tests anonymously without registering. Creating an account stores your historical accuracy and weak topic analytics.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs">
              <Link href="/signup" className="text-indigo-400 hover:underline font-medium">
                Create new student account
              </Link>
              <Link href="/" className="text-slate-400 hover:text-white">
                Continue anonymously $\rightarrow$
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
