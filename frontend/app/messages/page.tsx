'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';
import { messagesAPI } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';
import { io as socketIO, Socket } from 'socket.io-client';
import { getTokens } from '@/lib/api';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Send, Search, Paperclip, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';

let socket: Socket | null = null;

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM');
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(params.get('conv'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirect=/messages');
  }, [user, loading, router]);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    messagesAPI.getConversations().then(r => {
      setConversations(r.data.conversations);
      setLoadingConvs(false);
    }).catch(() => setLoadingConvs(false));
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    setLoadingMsgs(true);
    messagesAPI.getMessages(activeConvId).then(r => {
      setMessages(r.data.messages);
      setLoadingMsgs(false);
    }).catch(() => setLoadingMsgs(false));
    setConversations(c => c.map(conv => conv.id === activeConvId ? { ...conv, unread_count: 0 } : conv));
  }, [activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket.IO
  useEffect(() => {
    if (!user) return;
    const tokens = getTokens();
    if (!tokens) return;

    socket = socketIO(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token: tokens.access },
      transports: ['websocket'],
    });

    socket.on('new_message', (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setConversations(prev => prev.map(c =>
        c.id === msg.conversation_id
          ? { ...c, last_message: { body: msg.body, created_at: msg.created_at, sender_id: msg.sender_id }, unread_count: msg.sender_id !== user.id ? (activeConvId === msg.conversation_id ? 0 : c.unread_count + 1) : c.unread_count }
          : c
      ));
    });

    socket.on('user_typing', ({ user_id }: any) => {
      if (user_id !== user.id) setIsTyping(true);
    });
    socket.on('user_stopped_typing', () => setIsTyping(false));

    return () => { socket?.disconnect(); socket = null; };
  }, [user, activeConvId]);

  // Join conversation room
  useEffect(() => {
    if (!socket || !activeConvId) return;
    socket.emit('join_conversation', activeConvId);
    socket.emit('mark_read', activeConvId);
    return () => { socket?.emit('leave_conversation', activeConvId); };
  }, [activeConvId]);

  const handleSend = () => {
    if (!input.trim() || !activeConvId) return;
    socket?.emit('send_message', { conversation_id: activeConvId, body: input.trim() });
    setInput('');
  };

  const handleTyping = (value: string) => {
    setInput(value);
    if (!activeConvId) return;
    socket?.emit('typing_start', activeConvId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('typing_stop', activeConvId), 1500);
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="h-[calc(100vh-64px)] flex">
        {/* Conversations sidebar */}
        <div className={clsx('w-full md:w-80 border-r border-gray-100 flex flex-col bg-white', activeConvId ? 'hidden md:flex' : 'flex')}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-base mb-3">Messages</h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Search conversations…" className="input pl-9 text-sm py-2" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1"><div className="h-3 bg-gray-200 rounded w-2/3 mb-2" /><div className="h-2.5 bg-gray-200 rounded w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                  className={clsx('w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-l-2', activeConvId === conv.id ? 'bg-brand-50 border-brand-600' : 'border-transparent')}>
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-300 to-brand-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                      {conv.other_user.avatar_url ? (
                        <Image src={conv.other_user.avatar_url} alt="" width={44} height={44} className="object-cover" />
                      ) : conv.other_user.display_name?.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">{conv.other_user.display_name}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {conv.last_message ? formatMessageTime(conv.last_message.created_at) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {conv.last_message ? (conv.last_message.sender_id === user.id ? 'You: ' : '') + conv.last_message.body : 'No messages yet'}
                    </p>
                    {conv.project_title && <p className="text-xs text-brand-500 truncate">Re: {conv.project_title}</p>}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation area */}
        <div className={clsx('flex-1 flex flex-col bg-gray-50', !activeConvId ? 'hidden md:flex' : 'flex')}>
          {!activeConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="text-5xl mb-4">💬</div>
              <p className="font-medium text-base">Select a conversation</p>
              <p className="text-sm mt-1">Choose from your messages on the left</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
                <button onClick={() => setActiveConvId(null)} className="md:hidden text-gray-400 mr-1 text-lg">←</button>
                {activeConv && (
                  <>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-300 to-brand-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {activeConv.other_user.avatar_url ? (
                        <Image src={activeConv.other_user.avatar_url} alt="" width={36} height={36} className="object-cover" />
                      ) : activeConv.other_user.display_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{activeConv.other_user.display_name}</p>
                      <p className="text-xs text-gray-400">
                        {activeConv.other_user.last_seen_at ? `Last seen ${formatDistanceToNow(new Date(activeConv.other_user.last_seen_at), { addSuffix: true })}` : 'Offline'}
                      </p>
                    </div>
                    {activeConv.project_title && (
                      <span className="ml-auto text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded-lg">
                        Re: {activeConv.project_title}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
                ) : messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  const showDate = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-3">
                          <span className="bg-white text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-200">
                            {isToday(new Date(msg.created_at)) ? 'Today' : isYesterday(new Date(msg.created_at)) ? 'Yesterday' : format(new Date(msg.created_at), 'EEEE, MMM d')}
                          </span>
                        </div>
                      )}
                      <div className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                        <div className={clsx('max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed', isMe
                          ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm')}>
                          {msg.body}
                          <span className={clsx('block text-[10px] mt-0.5', isMe ? 'text-white/60 text-right' : 'text-gray-400')}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-100 p-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={e => handleTyping(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Type a message… (Enter to send)"
                      rows={1}
                      className="input resize-none py-2.5 pr-10 max-h-32 overflow-y-auto"
                      style={{ fieldSizing: 'content' } as any}
                    />
                  </div>
                  <button onClick={handleSend} disabled={!input.trim()}
                    className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}


