import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CreatorLink – Connect Creators & Clients', template: '%s | CreatorLink' },
  description: 'The platform that connects content creators, influencers, and freelancers with brands and clients for exceptional collaborations.',
  keywords: ['creator platform', 'influencer marketplace', 'content creator jobs', 'freelance creator'],
  openGraph: {
    type: 'website',
    siteName: 'CreatorLink',
    title: 'CreatorLink – Connect Creators & Clients',
    description: 'Find the perfect creator for your project, or discover exciting collaborations.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '10px', fontFamily: 'var(--font-dm-sans)', fontSize: '14px' },
              success: { iconTheme: { primary: '#7c3aed', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
