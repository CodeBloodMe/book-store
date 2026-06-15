'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [currentSuccess, setCurrentSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setCurrentError(null);
    setCurrentSuccess(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setCurrentError(error.message);
        setIsPending(false);
      } else {
        window.location.href = '/';
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) {
        setCurrentError(error.message);
        setIsPending(false);
      } else if (data.session) {
        window.location.href = '/';
      } else {
        setCurrentSuccess('Please check your email to confirm your account.');
        setIsPending(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border-2 border-gray-900 shadow-[6px_6px_0_#0a0a0a]">
        <div className="text-center mb-8">
          <Link href="/">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full border-2 border-gray-900 bg-[#f5f5f0] flex items-center justify-center overflow-hidden" style={{ boxShadow: '3px 3px 0 #0a0a0a' }}>
              <img src="/logo.png" alt="ChapterOne Logo" className="h-full w-full object-contain mix-blend-multiply grayscale contrast-125 brightness-110 scale-125 pl-1" />
            </div>
          </Link>
          <h1 className="text-4xl font-black mb-2 uppercase" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em', color: '#0a0a0a' }}>
            {isLogin ? 'Welcome Back' : 'Join ChapterOne'}
          </h1>
          <p className="text-gray-500 font-medium">
            {isLogin ? 'Sign in to access your reading lists.' : 'Create an account to track your books.'}
          </p>
        </div>

        {currentError && (
          <div className="p-4 mb-6 text-sm font-bold text-red-900 bg-red-100 rounded-xl border-2 border-red-900 shadow-[2px_2px_0_#7f1d1d]">
            {currentError}
          </div>
        )}

        {currentSuccess && (
          <div className="p-4 mb-6 text-sm font-bold text-green-900 bg-green-100 rounded-xl border-2 border-green-900 shadow-[2px_2px_0_#14532d]">
            {currentSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-gray-900 focus:shadow-[3px_3px_0_#0a0a0a] focus:outline-none transition-all"
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-gray-900 focus:shadow-[3px_3px_0_#0a0a0a] focus:outline-none transition-all"
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase mb-2" htmlFor="fullName">
                Full Name
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-gray-900 focus:shadow-[3px_3px_0_#0a0a0a] focus:outline-none transition-all"
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Alex Reader"
                required={!isLogin}
              />
            </div>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full font-black text-lg py-3 rounded-xl transition-all disabled:opacity-50"
              style={{ 
                background: isLogin ? '#f5e642' : '#0a0a0a',
                color: isLogin ? '#0a0a0a' : '#fff',
                border: '2px solid #0a0a0a',
                boxShadow: '4px 4px 0 #0a0a0a',
                transform: isPending ? 'translate(2px, 2px)' : 'none'
              }}
            >
              {isPending ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
