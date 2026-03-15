export const dynamic = 'force-dynamic'
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      router.push(params.get('redirect') || '/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1e1040] via-brand-800 to-[#1a3a5c] flex-col justify-center items-center p-12 text-white">
        <Link href="/" className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="font-black text-white">CL</span>
          </div>
          <span className="text-2xl font-black">CreatorLink</span>
        </Link>
        <blockquote className="text-center max-w-sm">
          <p className="text-xl font-light leading-relaxed text-white/90 mb-6">
            "CreatorLink helped me land 3 brand deals in my first month. The platform is exactly what the creator economy needed."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-400 flex items-center justify-center font-bold">SR</div>
            <div>
              <div className="font-semibold text-sm">Sophie R.</div>
              <div className="text-white/50 text-xs">120K YouTube creator</div>
            </div>
          </div>
        </blockquote>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="text-brand-600 font-bold text-lg lg:hidden block mb-6">CreatorLink</Link>
            <h1 className="text-3xl font-black mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to your CreatorLink account</p>
          </div>

          {params.get('session') === 'expired' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              Your session expired. Please sign in again.
            </div>
          )}

          {/* Google OAuth */}
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full border border-gray-200 rounded-xl py-3 hover:bg-gray-50 transition-colors mb-6 bg-white">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Continue with Google</span>
          </a>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-brand-600 font-semibold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

