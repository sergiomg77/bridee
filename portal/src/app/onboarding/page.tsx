'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import logger from '@/lib/logger';

interface FormValues {
  name: string;
  city: string;
  country: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState<FormValues>({ name: '', city: '', country: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Require authentication — redirect to /login if no session
  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        logger.error('OnboardingPage: getUser failed', error);
        router.replace('/login');
        return;
      }
      if (!user) {
        router.replace('/login');
        return;
      }
      setAuthLoading(false);
    }

    void checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          city: form.city || undefined,
          country: form.country || undefined,
        }),
      });

      const json = await res.json() as { boutiqueId?: string; error?: string };

      if (!res.ok) {
        logger.error('OnboardingPage: setup failed', { status: res.status, error: json.error });
        setErrorMessage(json.error ?? 'Setup failed. Please try again.');
        setSaveLoading(false);
        return;
      }

      logger.info('OnboardingPage: boutique created', { boutiqueId: json.boutiqueId });
      router.push('/dashboard');
    } catch (err) {
      logger.error('OnboardingPage: unexpected error', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setSaveLoading(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.2em] text-gray-800 uppercase">
            Bridee
          </h1>
          <p className="mt-2 text-sm text-gray-400 tracking-wide">Partner Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Set up your boutique</h2>
            <p className="mt-1 text-xs text-gray-400">
              This takes 30 seconds. You can update everything later in your profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className={labelClass}>
                Boutique Name <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Maison de Mariée"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="city" className={labelClass}>City</label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                placeholder="Ho Chi Minh City"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="country" className={labelClass}>Country</label>
              <input
                id="country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                placeholder="Vietnam"
                className={inputClass}
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-500 text-center">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition mt-2"
            >
              {saveLoading ? 'Setting up…' : 'Continue to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
