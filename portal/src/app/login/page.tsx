'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import logger from '@/lib/logger';

type Mode = 'signin' | 'signup';

async function ensureProfile(userId: string): Promise<void> {
  try {
    const res = await fetch('/api/auth/ensure-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      logger.error('LoginPage: ensure-profile failed', { status: res.status, error: json.error });
    }
  } catch (err) {
    logger.error('LoginPage: ensure-profile request threw', err);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMessage(null);
    setConfirmed(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const supabase = createClient();

    if (mode === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        logger.error('LoginPage: signInWithPassword failed', error);
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      logger.info('LoginPage: signed in', { userId: data.user?.id });
      await ensureProfile(data.user.id);
      router.push('/dashboard');
      router.refresh();
      return;
    }

    // Sign up
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      logger.error('LoginPage: signUp failed', error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    logger.info('LoginPage: sign up submitted', { userId: data.user?.id });

    if (data.user?.id) {
      await ensureProfile(data.user.id);
    }

    setConfirmed(true);
    setLoading(false);
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.2em] text-gray-800 uppercase">
            Bridee
          </h1>
          <p className="mt-2 text-sm text-gray-400 tracking-wide">Partner Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {confirmed ? (
            /* ── Confirmation message ── */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#C9A96E]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="font-medium text-gray-700">{email}</span>.
                Click it to activate your account, then sign in.
              </p>
              <button
                onClick={() => switchMode('signin')}
                className="mt-6 text-sm text-[#C9A96E] hover:text-[#b8945a] transition font-medium"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            /* ── Sign in / Sign up form ── */
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="boutique@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className={labelClass}>Password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>

                {errorMessage && (
                  <p className="text-sm text-red-500 text-center">{errorMessage}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition mt-2"
                >
                  {loading
                    ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
                    : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              {/* Mode toggle */}
              <p className="mt-6 text-center text-xs text-gray-400">
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      className="text-[#C9A96E] hover:text-[#b8945a] font-medium transition"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => switchMode('signin')}
                      className="text-[#C9A96E] hover:text-[#b8945a] font-medium transition"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
