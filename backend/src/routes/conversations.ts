import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';

const router = Router();

// Verify a user is a participant in a conversation
// Participants: the initiating bride (user_id) OR the boutique/vendor owner on the other side
async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('conversations')
    .select('user_id, boutique_id, vendor_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!data) return false;

  const conv = data as { user_id: string; boutique_id: string | null; vendor_id: string | null };

  if (conv.user_id === userId) return true;

  if (conv.boutique_id) {
    const { data: b } = await supabase
      .from('boutiques')
      .select('id')
      .eq('id', conv.boutique_id)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (b) return true;
  }

  if (conv.vendor_id) {
    const { data: v } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', conv.vendor_id)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (v) return true;
  }

  return false;
}

// ── Conversations ─────────────────────────────────────────────

// GET /api/conversations — full inbox with participant name, last message preview, unread count
router.get('/', auth, async (req, res) => {
  const userId = req.user!.id;

  // Collect boutique/vendor IDs owned by this user so boutique/vendor owners see their threads too
  const [{ data: ownedBoutiques }, { data: ownedVendors }] = await Promise.all([
    supabase.from('boutiques').select('id').eq('owner_user_id', userId),
    supabase.from('vendors').select('id').eq('owner_user_id', userId),
  ]);

  const boutiqueIds = (ownedBoutiques ?? []).map((b) => (b as { id: string }).id);
  const vendorIds = (ownedVendors ?? []).map((v) => (v as { id: string }).id);

  // OR filter: bride conversations + boutique owner threads + vendor owner threads
  const orParts: string[] = [`user_id.eq.${userId}`];
  if (boutiqueIds.length > 0) orParts.push(`boutique_id.in.(${boutiqueIds.join(',')})`);
  if (vendorIds.length > 0) orParts.push(`vendor_id.in.(${vendorIds.join(',')})`);

  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select(`
      id, user_id, participant_type, boutique_id, vendor_id, last_message_at, created_at,
      boutiques(id, name),
      vendors(id, name)
    `)
    .or(orParts.join(','))
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (convErr) {
    logger.error('GET /conversations failed', convErr);
    res.status(500).json({ data: null, error: convErr.message });
    return;
  }

  if (!conversations || conversations.length === 0) {
    res.json({ data: [], error: null });
    return;
  }

  const convIds = (conversations as Array<{ id: string }>).map((c) => c.id);

  // Fetch recent messages across all conversations in one query (capped for V1)
  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('id, conversation_id, content, message_type, is_read, sender_user_id, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
    .limit(500);

  if (msgErr) {
    logger.error('GET /conversations: messages fetch failed', msgErr);
    res.status(500).json({ data: null, error: msgErr.message });
    return;
  }

  // Group messages by conversation_id (already sorted newest-first)
  const messageMap = new Map<string, Array<Record<string, unknown>>>();
  for (const msg of (messages ?? []) as Array<Record<string, unknown>>) {
    const cid = msg.conversation_id as string;
    if (!messageMap.has(cid)) messageMap.set(cid, []);
    messageMap.get(cid)!.push(msg);
  }

  // Attach last_message preview and unread_count to each conversation
  const enriched = (conversations as Array<Record<string, unknown>>).map((conv) => {
    const msgs = messageMap.get(conv.id as string) ?? [];
    return {
      ...conv,
      last_message: msgs[0] ?? null, // newest first, so index 0 = most recent
      unread_count: msgs.filter((m) => !m.is_read && m.sender_user_id !== userId).length,
    };
  });

  res.json({ data: enriched, error: null });
});

// POST /api/conversations — start or resume a conversation, send first/next message
router.post('/', auth, async (req, res) => {
  const { participant_type, participant_id, initial_message } = req.body as {
    participant_type?: string;
    participant_id?: string;
    initial_message?: string;
  };

  if (!participant_type || !participant_id || !initial_message) {
    res.status(400).json({
      data: null,
      error: 'participant_type, participant_id, and initial_message are required',
    });
    return;
  }

  if (participant_type !== 'boutique' && participant_type !== 'vendor') {
    res.status(400).json({ data: null, error: 'participant_type must be "boutique" or "vendor"' });
    return;
  }

  const participantColumn = participant_type === 'boutique' ? 'boutique_id' : 'vendor_id';

  // Check if a conversation already exists for this (user, participant) pair
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', req.user!.id)
    .eq('participant_type', participant_type)
    .eq(participantColumn, participant_id)
    .maybeSingle();

  const now = new Date().toISOString();
  let conversationId: string;

  if (existing) {
    // Resume existing thread
    conversationId = (existing as { id: string }).id;
  } else {
    // Create new conversation
    const insertPayload: Record<string, unknown> = {
      user_id: req.user!.id,
      participant_type,
      last_message_at: now,
    };
    insertPayload[participantColumn] = participant_id;

    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert(insertPayload)
      .select()
      .single();

    if (convErr) {
      logger.error('POST /conversations: create failed', convErr);
      res.status(500).json({ data: null, error: convErr.message });
      return;
    }

    conversationId = (newConv as { id: string }).id;
  }

  // Insert the message
  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: req.user!.id,
      message_type: 'text',
      content: initial_message,
    })
    .select()
    .single();

  if (msgErr) {
    logger.error('POST /conversations: message insert failed', msgErr);
    res.status(500).json({ data: null, error: msgErr.message });
    return;
  }

  // Refresh last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: now, updated_at: now })
    .eq('id', conversationId);

  res.status(201).json({ data: { conversation_id: conversationId, message }, error: null });
});

// ── Messages ──────────────────────────────────────────────────

// GET /api/conversations/:id/messages — full thread, oldest-first
router.get('/:id/messages', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await isParticipant(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_user_id, message_type, content, is_read, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('GET /conversations/:id/messages failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/conversations/:id/messages — send a message in an existing thread
router.post('/:id/messages', auth, async (req, res) => {
  const { id } = req.params as { id: string };
  const { message_type, content } = req.body as { message_type?: string; content?: string };

  if (!message_type || !content) {
    res.status(400).json({ data: null, error: 'message_type and content are required' });
    return;
  }

  if (message_type !== 'text' && message_type !== 'image') {
    res.status(400).json({ data: null, error: 'message_type must be "text" or "image"' });
    return;
  }

  if (!(await isParticipant(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: id,
      sender_user_id: req.user!.id,
      message_type,
      content,
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /conversations/:id/messages failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  // Keep last_message_at current for inbox ordering
  const now = new Date().toISOString();
  await supabase
    .from('conversations')
    .update({ last_message_at: now, updated_at: now })
    .eq('id', id);

  res.status(201).json({ data, error: null });
});

// PUT /api/conversations/:id/read — mark all received messages in thread as read
router.put('/:id/read', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await isParticipant(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  // Only mark messages sent by others (not the current user) as read
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', id)
    .eq('is_read', false)
    .neq('sender_user_id', req.user!.id);

  if (error) {
    logger.error('PUT /conversations/:id/read failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data: { conversation_id: id, marked_read: true }, error: null });
});

export default router;
