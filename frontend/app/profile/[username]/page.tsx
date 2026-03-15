import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import ProfileActions from '@/components/profile/ProfileActions';
import { Star, MapPin, Globe, Clock, Users, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getProfile(username: string) {
  try {
    const res = await fetch(`${API}/users/${username}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile;
  } catch { return null; }
}

async function getReviews(username: string) {
  try {
    const res = await fetch(`${API}/reviews/user/${username}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return (await res.json()).reviews;
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const profile = await getProfile(params.username);
  if (!profile) return { title: 'Creator not found' };
  return {
    title: `${profile.display_name} (@${profile.username}) | CreatorLink`,
    description: profile.bio?.slice(0, 160),
    openGraph: { images: profile.avatar_url ? [profile.avatar_url] : [] },
  };
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'text-red-600 bg-red-50',
  instagram: 'text-pink-600 bg-pink-50',
  tiktok: 'text-gray-800 bg-gray-100',
  twitch: 'text-purple-600 bg-purple-50',
  twitter: 'text-blue-500 bg-blue-50',
};
const PLATFORM_ICONS: Record<string, string> = {
  youtube: '▶', instagram: '📸', tiktok: '♪', twitch: '🟣', twitter: '𝕏',
};

const AVAIL_COLORS: Record<string, { dot: string; text: string }> = {
  available: { dot: 'bg-green-400', text: 'text-green-700' },
  busy: { dot: 'bg-amber-400', text: 'text-amber-700' },
  unavailable: { dot: 'bg-gray-400', text: 'text-gray-500' },
};

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const [profile, reviews] = await Promise.all([
    getProfile(params.username),
    getReviews(params.username),
  ]);

  if (!profile) notFound();

  const avail = AVAIL_COLORS[profile.availability_status] || AVAIL_COLORS.unavailable;
  const totalFollowers = profile.social_links?.reduce((sum: number, sl: any) => sum + (sl.followers_count || 0), 0) || 0;

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Cover & Avatar */}
        <div className="relative mb-6">
          <div className="h-40 md:h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 via-brand-700 to-blue-800">
            {profile.banner_url && (
              <Image src={profile.banner_url} alt="Banner" fill className="object-cover" />
            )}
          </div>
          <div className="absolute bottom-0 translate-y-1/2 left-6 md:left-8">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-white overflow-hidden shadow-lg bg-gradient-to-br from-brand-400 to-brand-700">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-black text-3xl">
                  {profile.display_name?.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mt-14 md:mt-16 flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black">{profile.display_name}</h1>
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 ${avail.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
                {profile.availability_status}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">@{profile.username}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              {profile.location && <span className="flex items-center gap-1"><MapPin size={13} />{profile.location}</span>}
              {profile.languages?.length > 0 && <span className="flex items-center gap-1">🌐 {profile.languages.join(', ')}</span>}
              {profile.response_time && <span className="flex items-center gap-1"><Clock size={13} />{profile.response_time}</span>}
              {totalFollowers > 0 && <span className="flex items-center gap-1"><Users size={13} />{(totalFollowers / 1000).toFixed(0)}K total followers</span>}
            </div>
          </div>
          <ProfileActions profile={profile} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {profile.bio && (
              <div className="card p-6">
                <h2 className="font-bold text-base mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-bold text-base mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s: any) => (
                    <span key={s.id} className="badge bg-brand-50 text-brand-700 border border-brand-100">
                      <CheckCircle2 size={11} className="text-brand-400" />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social links */}
            {profile.social_links?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-bold text-base mb-3">Social Networks</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.social_links.map((sl: any) => (
                    <a key={sl.id} href={sl.url} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${PLATFORM_COLORS[sl.platform] || 'bg-gray-50 text-gray-700'}`}>
                      <span className="text-xl">{PLATFORM_ICONS[sl.platform] || '🔗'}</span>
                      <div>
                        <p className="font-semibold text-sm capitalize">{sl.platform}</p>
                        {sl.followers_count > 0 && (
                          <p className="text-xs opacity-70">{sl.followers_count >= 1000 ? `${(sl.followers_count / 1000).toFixed(1)}K` : sl.followers_count} followers</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            {profile.portfolio?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-bold text-base mb-4">Portfolio</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {profile.portfolio.map((item: any) => (
                    <a key={item.id} href={item.project_url || '#'} target="_blank" rel="noopener noreferrer"
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 hover:shadow-md transition-all">
                      {item.cover_url ? (
                        <Image src={item.cover_url} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200">
                          🎨
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-white text-xs font-medium line-clamp-2">{item.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base">Reviews</h2>
                {profile.avg_rating > 0 && (
                  <div className="flex items-center gap-2">
                    <Star size={16} fill="#f59e0b" className="text-amber-400" />
                    <span className="font-bold">{profile.avg_rating.toFixed(1)}</span>
                    <span className="text-gray-400 text-sm">({profile.total_reviews})</span>
                  </div>
                )}
              </div>
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev: any) => (
                    <div key={rev.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                            {rev.reviewer.display_name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{rev.reviewer.display_name}</p>
                            <p className="text-gray-400 text-xs">{new Date(rev.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill={i < rev.rating ? '#f59e0b' : 'transparent'} className={i < rev.rating ? 'text-amber-400' : 'text-gray-200'} />
                          ))}
                        </div>
                      </div>
                      {rev.title && <p className="text-sm font-medium mb-1">{rev.title}</p>}
                      <p className="text-gray-600 text-sm leading-relaxed">{rev.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Pricing */}
            <div className="card p-5">
              <h3 className="font-bold text-sm mb-3">Pricing</h3>
              {profile.hourly_rate ? (
                <div>
                  <p className="text-2xl font-black text-brand-600">€{profile.hourly_rate}<span className="text-base font-medium text-gray-400">/hr</span></p>
                  {profile.rate_negotiable && <p className="text-xs text-gray-400 mt-1">Negotiable for longer projects</p>}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Contact for pricing</p>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-brand-600 text-xs mt-3 hover:underline">
                  <Globe size={12} />{profile.website.replace('https://', '')}
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="card p-5">
              <h3 className="font-bold text-sm mb-3">Stats</h3>
              {[
                { label: 'Profile views', value: profile.profile_views },
                { label: 'Completed projects', value: profile.completed_projects },
                { label: 'Member since', value: new Date(profile.created_at).getFullYear() },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 text-xs">{s.label}</span>
                  <span className="font-semibold text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
