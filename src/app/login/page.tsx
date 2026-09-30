'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo =
    searchParams.get('redirectTo') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState('');

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const supabase = createClient();

      const {
        error,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(
          error.message ||
          'Invalid email or password.'
        );

        setIsLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();

    } catch (error) {
      console.error(
        'Login error:',
        error
      );

      setErrorMsg(
        'Something went wrong while signing in. Please try again.'
      );

      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      {/* Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-5 text-center">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-2xl font-extrabold text-white tracking-tight"
        >
          <BookOpen className="w-7 h-7 text-indigo-400" />
          <span>ExamPYQs</span>
        </Link>

        <div>
          <h1 className="text-xl font-semibold text-slate-200">
            Sign in to your ExamPYQs account
          </h1>

          <p className="text-xs text-slate-400 mt-2">
            Access your practice history,
            tests and learning progress.
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

        <div className="bg-slate-900 py-8 px-6 shadow-xl border border-slate-800 rounded-2xl">

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 bg-red-950/60 border border-red-800 text-red-200 p-3.5 rounded-lg text-xs flex items-start gap-2.5">

              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

              <span>{errorMsg}</span>

            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">

                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-300"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  Forgot password?
                </Link>

              </div>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                !email.trim() ||
                !password
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Student signup */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">

            <div className="text-center">
              <p className="text-xs text-slate-400">
                Don't have an account?
              </p>

              <Link
                href="/signup"
                className="inline-block mt-2 text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
              >
                Create a student account
              </Link>
            </div>

          </div>

          {/* Anonymous access */}
          <div className="mt-5 text-center">

            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Continue anonymously →
            </Link>

          </div>

        </div>
      </div>

    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400 text-xs">
          Loading login page...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}