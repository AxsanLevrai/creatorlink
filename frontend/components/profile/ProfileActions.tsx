'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usersAPI, messagesAPI } from '@/lib/api';
import { MessageSquare, Bookmark, BookmarkCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileActions({ profile }: { profile: any }) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(profile.is_saved || false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  const isOwnProfile = user?.id === profile.id;

  const handleMessage = async () => {
    if (!user) { router.push('/auth/login'); return; }
    try {
      const { data } = await messagesAPI.start(profile.id);
      router.push(`/messages?conv=${data.conversation_id}`);
    } catch {
      toast.error('Failed to start conversation');
    }
  };

  const toggleSave = async () => {
    if (!user) { router.push('/auth/login'); return; }
    setSavingBookmark(true);
    try {
      if (saved) {
        await usersAPI.unsaveCreator(profile.id);
        setSaved(false);
        toast.success('Removed from saved creators');
      } else {
        await usersAPI.saveCreator(profile.id);
        setSaved(true);
        toast.success('Creator saved');
      }
    } catch {
      toast.error('Failed');
    } finally {
      setSavingBookmark(false);
    }
  };

  if (isOwnProfile) {
    return (
      <div className="flex gap-2">
        <Link href="/settings" className="btn-outline text-sm">Edit Profile</Link>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={toggleSave} disabled={savingBookmark} className="btn-outline p-2.5" title={saved ? 'Unsave' : 'Save creator'}>
        {saved ? <BookmarkCheck size={18} className="text-brand-600" /> : <Bookmark size={18} />}
      </button>
      <button onClick={handleMessage} className="btn-primary flex items-center gap-2 text-sm">
        <MessageSquare size={16} /> Message
      </button>
    </div>
  );
}
