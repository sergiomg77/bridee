import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { Conversation, Message } from '../../types/message';

export async function getInbox(): Promise<{ data: Conversation[] | null; error: string | null }> {
  return apiFetch<Conversation[]>(API.conversations.list(), { method: 'GET' });
}

export async function startConversation(
  data: object
): Promise<{ data: Conversation | null; error: string | null }> {
  return apiFetch<Conversation>(API.conversations.list(), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMessages(
  conversationId: string
): Promise<{ data: Message[] | null; error: string | null }> {
  return apiFetch<Message[]>(API.conversations.messages(conversationId), { method: 'GET' });
}

export async function sendMessage(
  conversationId: string,
  data: object
): Promise<{ data: Message | null; error: string | null }> {
  return apiFetch<Message>(API.conversations.messages(conversationId), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markRead(
  conversationId: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.conversations.read(conversationId), { method: 'PUT' });
}
