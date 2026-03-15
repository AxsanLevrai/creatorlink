'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Users, Briefcase, MessageSquare, AlertTriangle, TrendingUp, Ban, CheckCircle, XCircle, Star } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const TABS = ['overview', 'users', 'projects', 'reports', 'audit'];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (tab === 'users') api.get('/admin/users', { params: { q: search } }).then(r => setUsers(r.data.users)).catch(() => {});
    if (tab === 'projects') api.get('/admin/projects').then(r => setProjects(r.data.projects)).catch(() => {});
    if (tab === 'reports') api.get('/admin/reports').then(r => setReports(r.data.reports)).catch(() => {});
    if (tab === 'audit') api.get('/admin/audit-log').then(r => setAuditLog(r.data.log)).catch(() => {});
  }, [tab, user, search]);

  const banUser = async (id: string) => {
    try {
      await api.post(`/admin/users/${id}/ban`, { reason: 'Admin ban' });
      toast.success('User banned');
      setUsers(u => u.map(x => x.id === id ? { ...x, status: 'suspended' } : x));
    } catch { toast.error('Failed to ban user'); }
  };

  const restoreUser = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/status`, { status: 'active' });
      toast.success('User restored');
      setUsers(u => u.map(x => x.id === id ? { ...x, status: 'active' } : x));
    } catch { toast.error('Failed to restore user'); }
  };

  const resolveReport = async (id: string) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status: 'resolved', admin_note: 'Resolved by admin' });
      toast.success('Report resolved');
      setReports(r => r.filter(x => x.id !== id));
    } catch { toast.error('Failed to resolve report'); }
  };

  const featureProject = async (id: string, featured: boolean) => {
    try {
      await api.patch(`/admin/projects/${id}/feature`, { featured });
      toast.success(featured ? 'Project featured' : 'Project unfeatured');
      setProjects(p => p.map(x => x.id === id ? { ...x, featured } : x));
    } catch { toast.error('Failed'); }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Shield size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Manage CreatorLink platform</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-4 py-2.5 text-sm font-medium capitalize whitespace-nowrap transition-colors border-b-2 -mb-px',
                tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.users?.total, sub: `+${stats.users?.new_7d} this week`, icon: Users, color: 'text-blue-600 bg-blue-50' },
                { label: 'Active Users', value: stats.users?.active, sub: `${stats.users?.suspended} suspended`, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
                { label: 'Total Projects', value: stats.projects?.total, sub: `${stats.projects?.open} open`, icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
                { label: 'Pending Reports', value: stats.reports?.pending, sub: `${stats.reports?.total} total`, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
              ].map(s => (
                <div key={s.label} className="card p-5">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.color)}>
                    <s.icon size={18} />
                  </div>
                  <div className="text-2xl font-black">{s.value || 0}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
                  <div className="text-gray-400 text-xs mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="input flex-1 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    {['User', 'Role', 'Status', 'Joined', 'Rating', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{u.display_name}</p>
                          <p className="text-gray-400 text-xs">@{u.username} · {u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('badge', u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('badge', u.status === 'active' ? 'bg-green-100 text-green-700' : u.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {u.avg_rating > 0 && <span className="flex items-center gap-1 text-amber-500"><Star size={11} fill="currentColor" />{u.avg_rating?.toFixed(1)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/profile/${u.username}`} className="text-xs text-brand-600 hover:underline">View</Link>
                          {u.status === 'active' ? (
                            <button onClick={() => banUser(u.id)} className="text-xs text-red-600 hover:underline">Ban</button>
                          ) : u.status === 'suspended' ? (
                            <button onClick={() => restoreUser(u.id)} className="text-xs text-green-600 hover:underline">Restore</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 && <div className="text-center py-12 text-gray-400">No pending reports 🎉</div>}
            {reports.map(r => (
              <div key={r.id} className="card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-red-100 text-red-700 capitalize">{r.type}</span>
                    <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm">{r.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Reported by @{r.reporter?.username}</p>
                  {r.reported_user && <p className="text-xs text-gray-500 mt-0.5">Target: @{r.reported_user?.username}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolveReport(r.id)} className="btn-outline text-xs flex items-center gap-1 text-green-600 border-green-200">
                    <CheckCircle size={13} /> Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {tab === 'projects' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    {['Project', 'Client', 'Status', 'Applications', 'Featured', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium line-clamp-1">{p.title}</p></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">@{p.client?.username}</td>
                      <td className="px-4 py-3"><span className={clsx('badge', p.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>{p.status}</span></td>
                      <td className="px-4 py-3 text-gray-500">{p.applications_count}</td>
                      <td className="px-4 py-3"><span className={clsx('badge', p.featured ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>{p.featured ? '⭐ Featured' : 'Normal'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/projects/${p.slug}`} className="text-xs text-brand-600 hover:underline">View</Link>
                          <button onClick={() => featureProject(p.id, !p.featured)} className="text-xs text-amber-600 hover:underline">
                            {p.featured ? 'Unfeature' : 'Feature'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Log */}
        {tab === 'audit' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    {['Admin', 'Action', 'Target', 'When'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {auditLog.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs font-medium">@{l.admin?.username}</td>
                      <td className="px-4 py-2.5"><span className="badge bg-gray-100 text-gray-600 text-xs">{l.action}</span></td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{l.target_type} {l.target_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Shield({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
