'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, inviteCode }),
      });

      const json = await res.json() as { success?: boolean; error?: string };

      if (!res.ok) {
        logger.warn('RegisterPage: registration failed', { status: res.status, error: json.error });
        setErrorMessage(json.error ?? 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      logger.info('RegisterPage: registration successful');
      router.push('/profile');
    } catch (err) {
      logger.error('RegisterPage: unexpected error during registration', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

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
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Create your boutique account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition"
                placeholder="boutique@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="inviteCode" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Invitation Code
              </label>
              <input
                id="inviteCode"
                type="text"
                autoComplete="off"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition"
                placeholder="Enter your invitation code"
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
