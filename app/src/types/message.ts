export type MessageType = 'text' | 'image';

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  message_type: MessageType;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  participant_type: 'boutique' | 'vendor';
  boutique_id: string | null;
  vendor_id: string | null;
  last_message_at: string | null;
  created_at: string;
  participant_name: string;
  participant_avatar_path: string | null;
  last_message: string | null;
  unread_count: number;
}
