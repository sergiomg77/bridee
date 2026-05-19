'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from '@/lib/auth';
import logger from '@/lib/logger';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log('[login] handleSubmit called', { email });
    setLoading(true);
    setError(null);

    try {
      console.log('[login] calling signIn...');
      const { error: signInError } = await signIn(email, password);
      console.log('[login] signIn result:', { error: signInError });

      if (signInError) {
        console.error('[login] signIn error:', signInError);
        logger.error('LoginPage: sign in failed', { error: signInError });
        setError(signInError);
        setLoading(false);
        return;
      }

      console.log('[login] signIn succeeded, fetching session...');
      const session = await getSession();
      console.log('[login] session:', session);

      logger.info('LoginPage: signed in');
      console.log('[login] pushing to /dashboard...');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('[login] unexpected error:', err);
      logger.error('LoginPage: unexpected error', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.2em] text-gray-800 uppercase">
            Bridee
          </h1>
          <p className="mt-2 text-sm text-gray-400 tracking-wide">Partner Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Sign in to your account</h2>

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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-[#C9A96E] hover:text-[#b8945a] font-medium transition"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
