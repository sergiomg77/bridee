'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import logger from '@/lib/logger';

export default function RegisterPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  function validate(): boolean {
    const next: Partial<Record<string, string>> = {};

    if (!businessName.trim()) {
      next.businessName = 'Business name is required.';
    }
    if (!email.trim()) {
      next.email = 'Email is required.';
    }
    if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, businessName, email, password }),
      });

      const json = await res.json() as { success?: boolean; error?: string };

      if (!res.ok) {
        logger.warn('RegisterPage: registration failed', { status: res.status, error: json.error });
        setErrors({ form: json.error ?? 'Registration failed. Please try again.' });
        setLoading(false);
        return;
      }

      logger.info('RegisterPage: registration successful');
      router.push('/dashboard');
    } catch (err) {
      logger.error('RegisterPage: unexpected error', err);
      setErrors({ form: 'An unexpected error occurred. Please try again.' });
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const inputErrorClass =
    'w-full px-4 py-3 rounded-xl border border-red-300 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.2em] text-gray-800 uppercase">
            Bridee
          </h1>
          <p className="mt-2 text-sm text-gray-400 tracking-wide">Partner Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Create your boutique account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invite code */}
            <div>
              <label htmlFor="inviteCode" className={labelClass}>
                Invitation Code <span className="text-red-400">*</span>
              </label>
              <input
                id="inviteCode"
                type="text"
                autoComplete="off"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className={errors.inviteCode ? inputErrorClass : inputClass}
                placeholder="Enter your invitation code"
              />
              {errors.inviteCode && (
                <p className="mt-1 text-xs text-red-500">{errors.inviteCode}</p>
              )}
            </div>

            {/* Business name */}
            <div>
              <label htmlFor="businessName" className={labelClass}>
                Business Name <span className="text-red-400">*</span>
              </label>
              <input
                id="businessName"
                type="text"
                autoComplete="organization"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={errors.businessName ? inputErrorClass : inputClass}
                placeholder="Maison de Mariée"
              />
              {errors.businessName && (
                <p className="mt-1 text-xs text-red-500">{errors.businessName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? inputErrorClass : inputClass}
                placeholder="boutique@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                Password <span className="text-red-400">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? inputErrorClass : inputClass}
                placeholder="Minimum 8 characters"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? inputErrorClass : inputClass}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.form && (
              <p className="text-sm text-red-500 text-center">{errors.form}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[#C9A96E] hover:text-[#b8945a] font-medium transition"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
