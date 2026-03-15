// components/layout/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  const links = {
    Platform: [
      { label: 'Find Creators', href: '/search/creators' },
      { label: 'Browse Projects', href: '/search/projects' },
      { label: 'Post a Project', href: '/projects/new' },
      { label: 'Pricing', href: '/pricing' },
    ],
    Community: [
      { label: 'Blog', href: '/blog' },
      { label: 'Discord', href: '#' },
      { label: 'Newsletter', href: '#' },
    ],
    Support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact', href: '/contact' },
      { label: 'Report Abuse', href: '/report' },
    ],
    Legal: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Cookie Policy', href: '/legal/cookies' },
    ],
  };

  return (
    <footer className="bg-[#1e1040] text-white/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">CL</span>
              </div>
              <span className="text-white font-bold text-lg">CreatorLink</span>
            </Link>
            <p className="text-sm leading-relaxed text-white/50">
              Connecting creators and clients for exceptional collaborations.
            </p>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-3">{category}</h4>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm hover:text-white transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">© 2025 CreatorLink. All rights reserved. GDPR compliant.</p>
          <p className="text-xs text-white/40">Made with ❤️ for the creator community</p>
        </div>
      </div>
    </footer>
  );
}
