'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { searchAPI } from '@/lib/api';
import { User, Pagination } from '@/lib/types';
import { Search, Filter, Star, MapPin, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';
import Image from 'next/image';

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitch', 'twitter'];
const FOLLOWER_RANGES = [
  { label: 'Any', value: '' },
  { label: '< 5K', value: '0-5000' },
  { label: '5K – 50K', value: '5000-50000' },
  { label: '50K – 100K', value: '50000-100000' },
  { label: '100K – 500K', value: '100000-500000' },
  { label: '500K+', value: '500000-' },
];
const SORT_OPTIONS = [
  { value: 'relevant', label: 'Most Relevant' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'followers', label: 'Most Followers' },
  { value: 'newest', label: 'Newest Profiles' },
  { value: 'rate_asc', label: 'Lowest Rate' },
  { value: 'rate_desc', label: 'Highest Rate' },
];
const AVAILABILITY = [
  { value: '', label: 'Any' },
  { value: 'available', label: '✅ Available' },
  { value: 'busy', label: '⏳ Busy' },
];

export default function SearchCreatorsPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [creators, setCreators] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [skills, setSkills] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    q: params.get('q') || '',
    platforms: params.get('platforms') || '',
    min_followers: '',
    max_followers: '',
    location: params.get('location') || '',
    skills: params.get('skills') || '',
    min_rating: '',
    max_rate: '',
    availability: '',
    sort: 'relevant',
    page: 1,
  });

  useEffect(() => {
    searchAPI.skills().then(r => setSkills(r.data.skills)).catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await searchAPI.creators(filters);
      setCreators(data.creators);
      setPagination(data.pagination);
    } catch {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [doSearch]);

  const setFilter = (key: string, value: string | number) =>
    setFilters(f => ({ ...f, [key]: value, page: 1 }));

  const togglePlatform = (p: string) => {
    const current = filters.platforms ? filters.platforms.split(',').filter(Boolean) : [];
    const updated = current.includes(p) ? current.filter(x => x !== p) : [...current, p];
    setFilter('platforms', updated.join(','));
  };

  const AVAIL_COLORS: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    busy: 'bg-amber-100 text-amber-700',
    unavailable: 'bg-gray-100 text-gray-500',
  };

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-1">Find Creators</h1>
          <p className="text-gray-500 text-sm">{pagination ? `${pagination.total} creators found` : 'Searching…'}</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.q}
              onChange={e => setFilter('q', e.target.value)}
              placeholder="Search by name, skill, bio…"
              className="input pl-10"
            />
          </div>
          <button onClick={() => setShowFilters(v => !v)} className="btn-outline flex items-center gap-2 text-sm">
            <Filter size={16} /> Filters
            {(filters.platforms || filters.min_rating || filters.availability) && (
              <span className="w-2 h-2 bg-brand-600 rounded-full" />
            )}
          </button>
          <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)} className="input w-44 text-sm">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="card p-5 mb-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => togglePlatform(p)}
                      className={clsx('badge capitalize cursor-pointer transition-colors', filters.platforms.includes(p)
                        ? 'bg-brand-100 text-brand-700 border border-brand-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Follower range</label>
                <div className="grid grid-cols-3 gap-2">
                  {FOLLOWER_RANGES.map(r => {
                    const [min, max] = r.value.split('-');
                    const active = filters.min_followers === (min || '') && filters.max_followers === (max || '');
                    return (
                      <button key={r.value} onClick={() => {
                        setFilters(f => ({ ...f, min_followers: min || '', max_followers: max || '', page: 1 }));
                      }} className={clsx('text-xs py-1.5 rounded-lg border transition-colors', active
                        ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Availability</label>
                  <select value={filters.availability} onChange={e => setFilter('availability', e.target.value)} className="input text-sm">
                    {AVAILABILITY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Min rating</label>
                  <select value={filters.min_rating} onChange={e => setFilter('min_rating', e.target.value)} className="input text-sm">
                    <option value="">Any</option>
                    {[4.5, 4, 3.5, 3].map(r => <option key={r} value={r}>{r}+ stars</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Location</label>
                <input value={filters.location} onChange={e => setFilter('location', e.target.value)} placeholder="Paris, London…" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Max hourly rate (€)</label>
                <input type="number" value={filters.max_rate} onChange={e => setFilter('max_rate', e.target.value)} placeholder="e.g. 100" className="input text-sm" />
              </div>
            </div>
            <button onClick={() => setFilters(f => ({ ...f, platforms: '', min_followers: '', max_followers: '', availability: '', min_rating: '', max_rate: '', location: '' }))}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X size={12} /> Clear all filters
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-gray-200 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500">No creators found matching your search.</p>
            <button onClick={() => setFilters(f => ({ ...f, q: '', platforms: '', min_followers: '', max_followers: '' }))}
              className="mt-3 text-brand-600 text-sm hover:underline">Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {creators.map(creator => (
                <Link key={creator.id} href={`/profile/${creator.username}`}
                  className="card hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden group">
                  <div className="h-20 bg-gradient-to-br from-brand-500 to-brand-800" />
                  <div className="px-5 pb-5 pt-0 -mt-8">
                    <div className="w-16 h-16 rounded-2xl border-4 border-white overflow-hidden bg-gradient-to-br from-brand-300 to-brand-600 mb-3">
                      {creator.avatar_url ? (
                        <Image src={creator.avatar_url} alt={creator.display_name} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                          {creator.display_name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold group-hover:text-brand-600 transition-colors">{creator.display_name}</p>
                        <p className="text-gray-400 text-xs">@{creator.username}</p>
                      </div>
                      {creator.avg_rating > 0 && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={12} fill="currentColor" />
                          <span className="text-xs font-semibold">{creator.avg_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    {creator.bio && (
                      <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">{creator.bio}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(creator.skills as any[])?.slice(0, 3).map((s: any) => (
                        <span key={s.slug} className="badge bg-gray-100 text-gray-600 text-xs">{s.name}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-gray-400">
                        <MapPin size={11} />
                        <span className="text-xs">{creator.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {creator.availability_status && (
                          <span className={clsx('badge text-xs', AVAIL_COLORS[creator.availability_status])}>
                            {creator.availability_status}
                          </span>
                        )}
                        {creator.hourly_rate && (
                          <span className="text-brand-600 font-bold text-sm">€{creator.hourly_rate}/h</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                      className={clsx('w-9 h-9 rounded-lg text-sm font-medium transition-colors', filters.page === p
                        ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300')}>
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
