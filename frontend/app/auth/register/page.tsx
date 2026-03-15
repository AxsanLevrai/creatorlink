'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authAPI, setTokens } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check } from 'lucide-react';
import clsx from 'clsx';

const schema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Min 3 chars').max(30, 'Max 30 chars').regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, _ and -'),
  display_name: z.string().min(2, 'Min 2 chars').max(100),
  password: z.string().min(8, 'Min 8 chars').regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Must contain a letter and a number'),
  role: z.enum(['creator', 'client']),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { setUser } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = params.get('role') as 'creator' | 'client' || 'creator';
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  const role = watch('role');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: res } = await authAPI.register(data);
      setTokens(res.tokens);
      setUser(res.user);
      toast.success('Account created! Please verify your email.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1e1040] via-brand-800 to-[#1a3a5c] flex-col justify-center items-center p-12 text-white">
        <Link href="/" className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="font-black text-white">CL</span>
          </div>
          <span className="text-2xl font-black">CreatorLink</span>
        </Link>
        <ul className="space-y-4 max-w-xs">
          {['Build a professional creator profile', 'Apply to brand deals & collaborations', 'Connect directly with clients', 'Get reviews and build your reputation'].map(item => (
            <li key={item} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-400 flex items-center justify-center flex-shrink-0">
                <Check size={12} className="text-white" />
              </div>
              <span className="text-white/80 text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="text-brand-600 font-bold text-lg lg:hidden block mb-6">CreatorLink</Link>
            <h1 className="text-3xl font-black mb-2">Create your account</h1>
            <p className="text-gray-500">Join 1,200+ creators on CreatorLink</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { value: 'creator', label: 'I\'m a Creator', desc: 'Looking for projects & collabs', emoji: '🎨' },
              { value: 'client', label: 'I\'m Hiring', desc: 'Looking for creators & talent', emoji: '💼' },
            ] as const).map(opt => (
              <button key={opt.value} type="button" onClick={() => setValue('role', opt.value)}
                className={clsx(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  role === opt.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'
                )}>
                <div className="text-2xl mb-1">{opt.emoji}</div>
                <div className={clsx('font-semibold text-sm', role === opt.value ? 'text-brand-700' : 'text-gray-800')}>{opt.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full border border-gray-200 rounded-xl py-3 hover:bg-gray-50 transition-colors mb-5 bg-white">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Continue with Google</span>
          </a>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full name</label>
              <input {...register('display_name')} placeholder="Sophie Renard" className="input" />
              {errors.display_name && <p className="text-red-500 text-xs mt-1">{errors.display_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input {...register('username')} placeholder="sophierenard" className="input pl-7" />
              </div>
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Min 8 chars, letters & numbers" className="input pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            By signing up you agree to our{' '}
            <Link href="/legal/terms" className="underline">Terms</Link> and{' '}
            <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
