'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';
import { projectsAPI, applicationsAPI, messagesAPI, usersAPI } from '@/lib/api';
import { Project, Application, Conversation } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Send, MessageSquare, Star, TrendingUp, Briefcase, Plus, ArrowRight, Clock } from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-600',
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login?redirect=/dashboard'); return; }
    if (!user) return;

    Promise.all([
      usersAPI.getStats(user.username).then(r => setStats(r.data)),
      projectsAPI.search({ limit: 5 }).then(r => setRecentProjects(r.data.projects)),
      messagesAPI.getConversations().then(r => setConversations(r.data.conversations.slice(0, 4))),
      user.role === 'creator'
        ? applicationsAPI.mine().then(r => setMyApplications(r.data.applications.slice(0, 5)))
        : projectsAPI.mine().then(r => setMyProjects(r.data.projects.slice(0, 5))),
    ]).catch(() => {});
  }, [user, loading]);

  if (loading) return (
    <><Navbar /><div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div></>
  );
  if (!user) return null;

  const isCreator = user.role === 'creator';

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">Hey, {user.display_name?.split(' ')[0]} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">Here's what's happening with your account today.</p>
          </div>
          <Link href={isCreator ? `/profile/${user.username}` : '/projects/new'}
            className="btn-primary flex items-center gap-2 text-sm">
            {isCreator ? <><Eye size={15} /> View Profile</> : <><Plus size={15} /> Post Project</>}
          </Link>
        </div>

        {/* Email verification banner */}
        {user.status === 'pending_verification' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <p className="text-amber-800 text-sm">📧 Please verify your email address to unlock all features.</p>
            <button className="text-amber-700 font-semibold text-sm underline">Resend email</button>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {isCreator ? [
            { label: 'Profile Views', value: stats?.profile_views || user.profile_views || 0, icon: Eye, color: 'text-blue-500 bg-blue-50' },
            { label: 'Applications', value: stats?.applications_sent || 0, icon: Send, color: 'text-purple-500 bg-purple-50' },
            { label: 'Conversations', value: stats?.conversations || 0, icon: MessageSquare, color: 'text-green-500 bg-green-50' },
            { label: 'Avg Rating', value: user.avg_rating ? `${user.avg_rating.toFixed(1)}★` : '—', icon: Star, color: 'text-amber-500 bg-amber-50' },
          ] : [
            { label: 'Projects Posted', value: myProjects.length, icon: Briefcase, color: 'text-blue-500 bg-blue-50' },
            { label: 'Open Projects', value: myProjects.filter(p => p.status === 'open').length, icon: TrendingUp, color: 'text-green-500 bg-green-50' },
            { label: 'Messages', value: conversations.filter(c => c.unread_count > 0).length, icon: MessageSquare, color: 'text-purple-500 bg-purple-50' },
            { label: 'Conversations', value: conversations.length, icon: MessageSquare, color: 'text-amber-500 bg-amber-50' },
          ].map(stat => (
            <div key={stat.label} className="card p-5">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.color)}>
                <stat.icon size={18} />
              </div>
              <div className="text-2xl font-black">{stat.value}</div>
              <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {isCreator ? (
              <>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-base">My Applications</h2>
                    <Link href="/applications" className="text-brand-600 text-sm flex items-center gap-1 hover:underline">View all <ArrowRight size={14} /></Link>
                  </div>
                  {myApplications.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm mb-3">No applications yet</p>
                      <Link href="/search/projects" className="btn-primary text-sm">Browse projects</Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myApplications.map(app => (
                        <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{app.project?.title}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</p>
                          </div>
                          <span className={clsx('badge text-xs', STATUS_COLORS[app.status])}>{app.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-base">Recommended Projects</h2>
                    <Link href="/search/projects" className="text-brand-600 text-sm flex items-center gap-1 hover:underline">Browse all <ArrowRight size={14} /></Link>
                  </div>
                  <div className="space-y-3">
                    {recentProjects.map(proj => (
                      <Link key={proj.id} href={`/projects/${proj.slug}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 text-lg">
                          {proj.category?.icon === 'video' ? '🎬' : proj.category?.icon === 'palette' ? '🎨' : '💼'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm group-hover:text-brand-600 transition-colors truncate">{proj.title}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{proj.client.display_name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-brand-600 font-bold text-sm">
                            {proj.budget_fixed ? `€${proj.budget_fixed}` : proj.budget_min ? `€${proj.budget_min}–${proj.budget_max}` : 'Negotiable'}
                          </p>
                          <p className="text-gray-400 text-xs flex items-center gap-1 justify-end">
                            <Clock size={10} /> {proj.deadline ? new Date(proj.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Open'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-base">My Projects</h2>
                  <Link href="/projects/new" className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> New project</Link>
                </div>
                {myProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm mb-3">No projects yet</p>
                    <Link href="/projects/new" className="btn-primary text-sm">Post your first project</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myProjects.map(proj => (
                      <Link key={proj.id} href={`/projects/${proj.slug}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{proj.title}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{proj.applications_count} applications</p>
                        </div>
                        <span className={clsx('badge text-xs', STATUS_COLORS[proj.status])}>{proj.status}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile card */}
            <div className="card overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-brand-500 to-brand-700" />
              <div className="px-5 pb-5 pt-0 -mt-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center mb-3 border-4 border-white">
                  <span className="text-white font-black text-xl">{user.display_name?.slice(0, 2).toUpperCase()}</span>
                </div>
                <p className="font-bold">{user.display_name}</p>
                <p className="text-gray-400 text-xs">@{user.username}</p>
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-center">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{user.profile_views}</p>
                    <p className="text-gray-400 text-xs">Views</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{user.completed_projects}</p>
                    <p className="text-gray-400 text-xs">Projects</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{user.avg_rating ? `${user.avg_rating.toFixed(1)}★` : '—'}</p>
                    <p className="text-gray-400 text-xs">Rating</p>
                  </div>
                </div>
                <Link href={`/profile/${user.username}`} className="btn-outline w-full mt-3 text-sm text-center block">
                  View public profile
                </Link>
              </div>
            </div>

            {/* Recent messages */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Recent Messages</h3>
                <Link href="/messages" className="text-brand-600 text-xs hover:underline">View all</Link>
              </div>
              {conversations.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-4">No messages yet</p>
              ) : (
                <div className="space-y-2">
                  {conversations.slice(0, 3).map(conv => (
                    <Link key={conv.id} href={`/messages?conv=${conv.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {conv.other_user.display_name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{conv.other_user.display_name}</p>
                        <p className="text-gray-400 text-xs truncate">{conv.last_message?.body?.slice(0, 30)}…</p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="w-4 h-4 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                          {conv.unread_count}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
