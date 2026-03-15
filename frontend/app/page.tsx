import Link from 'next/link';
import { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { searchAPI } from '@/lib/api';

export const metadata: Metadata = {
  title: 'CreatorLink – Connect Creators & Clients',
};

const PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Twitch', 'Twitter', 'Podcast'];
const CATEGORIES = [
  { name: 'Video & Animation', icon: '🎬', slug: 'video-animation' },
  { name: 'Design & Creative', icon: '🎨', slug: 'design-creative' },
  { name: 'Writing & Content', icon: '✍️', slug: 'writing-content' },
  { name: 'Music & Audio', icon: '🎵', slug: 'music-audio' },
  { name: 'Marketing & Social', icon: '📈', slug: 'marketing-social' },
  { name: 'Web & Development', icon: '💻', slug: 'web-development' },
  { name: 'Photography', icon: '📸', slug: 'photography' },
  { name: 'Gaming', icon: '🎮', slug: 'gaming' },
];

const STATS = [
  { label: 'Active Creators', value: '1,200+' },
  { label: 'Projects Posted', value: '850+' },
  { label: 'Collaborations', value: '2,400+' },
  { label: 'Satisfaction Rate', value: '95%' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create Your Profile', desc: 'Show your work, skills, and audience. Whether you\'re a nano or mega creator, everyone has a place.', icon: '👤' },
  { step: '02', title: 'Discover Opportunities', desc: 'Browse projects from brands, agencies, and other creators looking for collaborators.', icon: '🔍' },
  { step: '03', title: 'Apply & Connect', desc: 'Send your proposal, chat directly with clients, and close the deal.', icon: '🤝' },
  { step: '04', title: 'Collaborate & Grow', desc: 'Complete the project, receive a review, and build your creator reputation.', icon: '🚀' },
];

export default async function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1e1040] via-[#2d1b69] to-[#1a3a5c] py-24 px-4">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="text-brand-300 text-sm">✦</span>
              <span className="text-white/90 text-sm font-medium">Platform #1 for content creators</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
              Connect the<br />
              <span className="bg-gradient-to-r from-brand-300 to-blue-400 bg-clip-text text-transparent">
                Creative World
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              The marketplace connecting creators, influencers, and freelancers with brands and clients for exceptional collaborations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register?role=creator" className="bg-white text-brand-700 font-bold px-8 py-4 rounded-xl hover:bg-white/90 transition-all text-sm">
                I'm a Creator →
              </Link>
              <Link href="/auth/register?role=client" className="bg-brand-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-brand-500 transition-all text-sm border border-brand-400">
                I'm Hiring Creators →
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 justify-center mt-12">
              {STATS.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-black text-white">{s.value}</div>
                  <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="py-10 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {PLATFORMS.map(p => (
                <Link key={p} href={`/search/creators?platforms=${p.toLowerCase()}`}
                  className="badge bg-gray-100 text-gray-600 hover:bg-brand-100 hover:text-brand-700 transition-colors px-4 py-2 text-sm font-medium rounded-full">
                  {p}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3">Browse by Category</h2>
              <p className="text-gray-500">Find the right talent for every creative need</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {CATEGORIES.map(cat => (
                <Link key={cat.slug} href={`/search/creators?category=${cat.slug}`}
                  className="card p-6 text-center hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group">
                  <div className="text-4xl mb-3">{cat.icon}</div>
                  <div className="font-semibold text-sm text-gray-800 group-hover:text-brand-600 transition-colors">{cat.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black mb-3">How CreatorLink Works</h2>
              <p className="text-gray-500">Four simple steps to your next collaboration</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {HOW_IT_WORKS.map((item, i) => (
                <div key={i} className="relative text-center">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-2/3 w-full h-px border-t-2 border-dashed border-gray-200" />
                  )}
                  <div className="w-16 h-16 rounded-2xl bg-brand-50 text-3xl flex items-center justify-center mx-auto mb-4">
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold text-brand-400 mb-2">{item.step}</div>
                  <h3 className="font-bold text-base mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-gradient-to-br from-brand-600 to-brand-800">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-black text-white mb-4">Ready to Create Together?</h2>
            <p className="text-brand-200 mb-8 text-lg">Join 1,200+ creators already building amazing things on CreatorLink.</p>
            <Link href="/auth/register" className="bg-white text-brand-700 font-bold px-10 py-4 rounded-xl hover:bg-white/90 transition-all text-base inline-block">
              Create your free account →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
