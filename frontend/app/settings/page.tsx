'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';
import { authAPI, usersAPI, uploadAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Shield, Bell, Lock, User, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'danger', label: 'Account', icon: Trash2 },
];

export default function SettingsPage() {
  const { user, refresh, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirect=/settings');
  }, [user, loading, router]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black mb-6">Settings</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar tabs */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                    tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50',
                    t.id === 'danger' && 'text-red-600 hover:bg-red-50')}>
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {tab === 'profile' && <ProfileSettings user={user} onSave={refresh} />}
            {tab === 'security' && <SecuritySettings />}
            {tab === 'notifications' && <NotificationSettings user={user} />}
            {tab === 'privacy' && <PrivacySettings user={user} />}
            {tab === 'danger' && <DangerSettings />}
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileSettings({ user, onSave }: { user: any; onSave: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: {
    display_name: user.display_name || '',
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
    hourly_rate: user.hourly_rate || '',
    availability_status: user.availability_status || 'available',
  }});
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await usersAPI.updateProfile(data);
      await onSave();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      await uploadAPI.avatar(file);
      await onSave();
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-bold text-base mb-4">Public Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-black text-2xl overflow-hidden">
            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : user.display_name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <span className="btn-outline text-sm flex items-center gap-2">
                <Upload size={14} /> {avatarLoading ? 'Uploading…' : 'Change avatar'}
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP. Max 10MB.</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Display name</label>
            <input {...register('display_name', { required: true, minLength: 2 })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Location</label>
            <input {...register('location')} placeholder="Paris, France" className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Bio</label>
          <textarea {...register('bio')} rows={4} placeholder="Tell people about yourself…" className="input resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Website</label>
            <input {...register('website')} type="url" placeholder="https://yoursite.com" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Hourly rate (€)</label>
            <input {...register('hourly_rate')} type="number" min="0" placeholder="e.g. 45" className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Availability</label>
          <select {...register('availability_status')} className="input">
            <option value="available">✅ Available</option>
            <option value="busy">⏳ Busy</option>
            <option value="unavailable">❌ Not available</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}

function SecuritySettings() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ current: string; next: string; confirm: string }>();

  const onChangePassword = async (data: any) => {
    if (data.next !== data.confirm) { toast.error('Passwords don\'t match'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword(data.current, data.next);
      toast.success('Password changed successfully');
      reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-base mb-4">Change Password</h2>
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Current password</label>
            <div className="relative">
              <input {...register('current', { required: true })} type={showCurrent ? 'text' : 'password'} className="input pr-10" />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">New password</label>
            <div className="relative">
              <input {...register('next', { required: true, minLength: 8 })} type={showNew ? 'text' : 'password'} placeholder="Min 8 chars, letters & numbers" className="input pr-10" />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm new password</label>
            <input {...register('confirm', { required: true })} type="password" className="input" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Changing…' : 'Change password'}</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-base mb-2">Connected accounts</h2>
        <p className="text-gray-500 text-sm mb-4">Manage your social login connections.</p>
        <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
          className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span className="text-sm font-medium">Connect Google</span>
        </a>
      </div>
    </div>
  );
}

function NotificationSettings({ user }: { user: any }) {
  const prefs = user.notification_prefs || {};
  const [settings, setSettings] = useState(prefs);
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => setSettings((s: any) => ({ ...s, [key]: !s[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await usersAPI.updateNotificationPrefs(settings);
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const items = [
    { key: 'email_messages', label: 'New messages', desc: 'Get notified when you receive a new message' },
    { key: 'email_applications', label: 'Project applications', desc: 'When someone applies to your project or your application status changes' },
    { key: 'email_reviews', label: 'New reviews', desc: 'When you receive a new review on your profile' },
    { key: 'push_all', label: 'In-app notifications', desc: 'Real-time notifications in the platform' },
  ];

  return (
    <div className="card p-6">
      <h2 className="font-bold text-base mb-4">Notification Preferences</h2>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <button onClick={() => toggle(item.key)}
              className={clsx('w-11 h-6 rounded-full transition-colors relative flex-shrink-0', settings[item.key] ? 'bg-brand-600' : 'bg-gray-200')}>
              <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform', settings[item.key] ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="btn-primary mt-5">{saving ? 'Saving…' : 'Save preferences'}</button>
    </div>
  );
}

function PrivacySettings({ user }: { user: any }) {
  const [settings, setSettings] = useState({
    show_email: user.show_email || false,
    show_phone: user.show_phone || false,
    profile_public: user.profile_public !== false,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => setSettings(s => ({ ...s, [key]: !s[key as keyof typeof s] }));

  const save = async () => {
    setSaving(true);
    try {
      await usersAPI.updatePrivacy(settings);
      toast.success('Privacy settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const items = [
    { key: 'profile_public', label: 'Public profile', desc: 'Allow anyone to view your profile' },
    { key: 'show_email', label: 'Show email', desc: 'Display your email address on your public profile' },
    { key: 'show_phone', label: 'Show phone', desc: 'Display your phone number on your public profile' },
  ];

  return (
    <div className="card p-6">
      <h2 className="font-bold text-base mb-1">Privacy & Visibility</h2>
      <p className="text-gray-400 text-sm mb-4">Control what information is visible to others.</p>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <button onClick={() => toggle(item.key)}
              className={clsx('w-11 h-6 rounded-full transition-colors relative flex-shrink-0', settings[item.key as keyof typeof settings] ? 'bg-brand-600' : 'bg-gray-200')}>
              <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform', settings[item.key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="btn-primary mt-5">{saving ? 'Saving…' : 'Save settings'}</button>
    </div>
  );
}

function DangerSettings() {
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    setDeleting(true);
    try {
      await usersAPI.deleteAccount('DELETE');
      toast.success('Account deleted');
      logout();
    } catch {
      toast.error('Failed to delete account. Contact support.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card p-6 border-red-100">
      <h2 className="font-bold text-base text-red-600 mb-1">Delete Account</h2>
      <p className="text-gray-500 text-sm mb-4">
        This will permanently delete your account, profile, and all associated data. This action cannot be undone.
      </p>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <p className="text-red-700 text-sm font-medium mb-2">Type <strong>DELETE</strong> to confirm:</p>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="DELETE" className="input border-red-200 focus:ring-red-400" />
      </div>
      <button onClick={handleDelete} disabled={deleting || confirm !== 'DELETE'}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
        {deleting ? 'Deleting…' : 'Delete my account permanently'}
      </button>
    </div>
  );
}
