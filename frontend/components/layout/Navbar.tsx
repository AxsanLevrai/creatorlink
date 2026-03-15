'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Bell, MessageSquare, ChevronDown, Menu, X, Search, LogOut, Settings, User, LayoutDashboard, Plus } from 'lucide-react';
import { notificationsAPI } from '@/lib/api';
import { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    notificationsAPI.list().then(({ data }) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <span className="text-white font-black text-sm">CL</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
              CreatorLink
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/search/creators" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
              Find Creators
            </Link>
            <Link href="/search/projects" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
              Browse Projects
            </Link>
            {user && (
              <Link href="/projects/new" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-1">
                <Plus size={14} /> Post Project
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(v => !v)}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-8">No notifications</p>
                        ) : (
                          notifications.slice(0, 10).map(n => (
                            <div key={n.id} className={clsx('px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0', !n.read && 'bg-brand-50/50')}>
                              <p className="text-sm font-medium text-gray-800">{n.title}</p>
                              {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>}
                              <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <Link href="/messages" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <MessageSquare size={20} />
                </Link>

                {/* User menu */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt={user.display_name} width={32} height={32} className="object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">
                          {user.display_name?.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-sm">{user.display_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">@{user.username}</p>
                      </div>
                      {[
                        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { href: `/profile/${user.username}`, icon: User, label: 'My Profile' },
                        { href: '/settings', icon: Settings, label: 'Settings' },
                        ...(user.role === 'admin' ? [{ href: '/admin', icon: Settings, label: 'Admin Panel' }] : []),
                      ].map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <item.icon size={16} className="text-gray-400" />
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-gray-100 mt-1">
                        <button onClick={logout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut size={16} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn-outline text-sm py-2">Sign in</Link>
                <Link href="/auth/register" className="btn-primary text-sm py-2">Get started</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link href="/search/creators" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Find Creators</Link>
          <Link href="/search/projects" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Browse Projects</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Dashboard</Link>
              <Link href="/messages" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Messages</Link>
              <Link href="/settings" className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Settings</Link>
              <button onClick={logout} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">Sign out</button>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/auth/login" className="btn-outline text-sm text-center">Sign in</Link>
              <Link href="/auth/register" className="btn-primary text-sm text-center">Get started</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
