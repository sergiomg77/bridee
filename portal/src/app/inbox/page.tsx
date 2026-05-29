'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { createClient } from '@/lib/supabase';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  user_id: string;
  last_message_at: string | null;
  bride_name: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  message_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: string | null): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatMessageTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getMessageImageSrc(content: string): string {
  if (content.startsWith('http') || content.startsWith('data:image')) return content;
  return `data:image/jpeg;base64,${content}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxPage() {
  const supabase = createClient();

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        console.log('InboxPage: init started');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('InboxPage: getUser', { userId: user?.id, error: userError?.message });
        if (userError || !user) {
          setPageError('Not authenticated.');
          setPageLoading(false);
          return;
        }

        setMyUserId(user.id);

        // v3: profiles has no boutique_id — query boutiques by owner_user_id
        console.log('InboxPage: querying boutique for user', user.id);
        const { data: boutique, error: boutiqueError } = await supabase
          .from('boutiques')
          .select('id')
          .eq('owner_user_id', user.id)
          .limit(1)
          .single();

        console.log('InboxPage: boutique result', { boutiqueId: boutique?.id, error: boutiqueError?.message });

        if (boutiqueError || !boutique) {
          logger.error('InboxPage: boutique query failed', boutiqueError);
          setPageError('Failed to load boutique.');
          setPageLoading(false);
          return;
        }

        setBoutiqueId(boutique.id);
        console.log('InboxPage: boutiqueId set', boutique.id);
      } catch (err) {
        logger.error('InboxPage: init error', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load conversations ────────────────────────────────────────
  useEffect(() => {
    if (!boutiqueId) return;
    void loadConversations(boutiqueId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutiqueId]);

  async function loadConversations(bid: string) {
    setConvsLoading(true);
    try {
      const { data: convRows, error: convError } = await supabase
        .from('conversations')
        .select('id, user_id, last_message_at')
        .eq('boutique_id', bid)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convError) {
        logger.error('InboxPage: conversations query failed', convError);
        setConvsLoading(false);
        return;
      }

      const rows = (convRows ?? []) as { id: string; user_id: string; last_message_at: string | null }[];
      if (rows.length === 0) {
        setConversations([]);
        setConvsLoading(false);
        return;
      }

      // Batch-load bride names from profiles
      const userIds = rows.map((r) => r.user_id);
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap = new Map<string, string>();
      for (const p of profileRows ?? []) {
        const pr = p as { id: string; full_name: string | null };
        if (pr.full_name) nameMap.set(pr.id, pr.full_name);
      }

      setConversations(rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        last_message_at: r.last_message_at,
        bride_name: nameMap.get(r.user_id) ?? 'Bride',
      })));
    } catch (err) {
      logger.error('InboxPage: unexpected error loading conversations', err);
    } finally {
      setConvsLoading(false);
    }
  }

  // ── Load messages when conversation selected ──────────────────
  useEffect(() => {
    if (!selectedConvId || !myUserId) return;
    void loadMessages(selectedConvId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvId]);

  async function loadMessages(convId: string) {
    setMsgsLoading(true);
    setSendError(null);

    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_user_id, message_type, content, is_read, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('InboxPage: messages query failed', error);
    } else {
      setMessages((data ?? []) as Message[]);
      // Mark unread as read (messages from brides)
      void markAsRead(convId);
    }

    setMsgsLoading(false);
  }

  async function markAsRead(convId: string) {
    if (!myUserId) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .eq('is_read', false)
      .neq('sender_user_id', myUserId);
  }

  // ── Realtime: subscribe to new messages in selected conversation ──
  useEffect(() => {
    if (!selectedConvId) return;

    const channel = supabase
      .channel(`inbox-messages-${selectedConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if from bride
          if (newMsg.sender_user_id !== myUserId) {
            void supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvId]);

  // ── Auto-scroll to bottom ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedConvId || !myUserId || !messageText.trim()) return;

    setSending(true);
    setSendError(null);

    const content = messageText.trim();
    setMessageText('');

    const { data: sent, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConvId,
        sender_user_id: myUserId,
        message_type: 'text',
        content,
        is_read: false,
      })
      .select('id, conversation_id, sender_user_id, message_type, content, is_read, created_at')
      .single();

    if (error) {
      logger.error('InboxPage: message send failed', error);
      setSendError(error.message);
      setMessageText(content);
    } else {
      // Optimistically append so the message appears immediately without waiting for realtime
      setMessages((prev) => {
        const newMsg = sent as Message;
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Update last_message_at on conversation
      void supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConvId);
    }

    setSending(false);
  }

  function handleSelectConversation(convId: string) {
    if (convId === selectedConvId) return;
    setSelectedConvId(convId);
    setMessages([]);
    setMessageText('');
    setSendError(null);
  }

  // ─── Render ───────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <PortalLayout title="Inbox">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Inbox">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  return (
    <PortalLayout title="Inbox">
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── Conversation list ─────────────────────────────────── */}
        <div className={`w-72 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col ${selectedConvId ? 'hidden sm:flex' : 'flex'}`}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Conversations</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No conversations yet.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition ${
                    selectedConvId === conv.id ? 'bg-[#C9A96E]/5 border-l-2 border-l-[#C9A96E]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-800 truncate">{conv.bride_name}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatRelativeTime(conv.last_message_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Message thread ────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${selectedConvId ? 'flex' : 'hidden sm:flex'}`}>

          {/* Thread header */}
          {selectedConv ? (
            <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
              <button
                className="sm:hidden text-gray-400 hover:text-gray-600 mr-1"
                onClick={() => setSelectedConvId(null)}
              >
                ←
              </button>
              <div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-[#C9A96E]">
                  {selectedConv.bride_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800">{selectedConv.bride_name}</p>
            </div>
          ) : (
            <div className="px-6 py-4 bg-white border-b border-gray-100">
              <p className="text-sm text-gray-400">Select a conversation</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {!selectedConvId ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">Select a conversation to start messaging.</p>
              </div>
            ) : msgsLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">Loading…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_user_id === myUserId;
                return (
                  <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? 'bg-[#8B6F5E] text-white rounded-br-none'
                        : 'bg-stone-100 text-gray-800 rounded-bl-none'
                    }`}>
                      {msg.message_type === 'image' ? (() => {
                        const imgSrc = getMessageImageSrc(msg.content);
                        return (
                          <a href={imgSrc} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgSrc} alt="attachment" className="max-w-full h-auto rounded-xl" />
                          </a>
                        );
                      })() : (
                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send form */}
          {selectedConvId && (
            <div className="px-6 py-4 bg-white border-t border-gray-100">
              {sendError && <p className="text-xs text-red-500 mb-2">{sendError}</p>}
              <form onSubmit={(e) => void handleSend(e)} className="flex gap-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
