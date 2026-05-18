import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { getMessages, sendMessage, markRead } from '../../services/conversation/conversationService';
import { supabase } from '../../lib/supabase';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { Message } from '../../types/message';
import type { MessagesStackParamList } from '../../types/navigation';

type Props = StackScreenProps<MessagesStackParamList, 'ConversationScreen'>;

type SupabaseChannel = ReturnType<typeof supabase.channel>;

export default function ConversationScreen({ route, navigation }: Props) {
  const { conversationId, participantName } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<Message>>(null);
  const channelRef = useRef<SupabaseChannel | null>(null);

  useEffect(() => {
    initScreen();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId]);

  async function initScreen() {
    const [sessionResult] = await Promise.all([
      supabase.auth.getSession(),
      loadMessages(),
    ]);
    setCurrentUserId(sessionResult.data.session?.user.id ?? null);
    subscribeToMessages();
  }

  async function loadMessages() {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await getMessages(conversationId);
    if (error) {
      logger.error('ConversationScreen: getMessages failed', { error });
      setErrorMessage(error);
      setLoading(false);
      return;
    }

    setMessages(data ?? []);
    setLoading(false);

    markRead(conversationId).catch((err) =>
      logger.error('ConversationScreen: markRead failed', err)
    );
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    channelRef.current = channel;
  }

  function scrollToBottom() {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;

    setText('');
    setSending(true);

    const { data, error } = await sendMessage(conversationId, {
      message_type: 'text',
      content,
    });

    if (error) {
      logger.error('ConversationScreen: sendMessage failed', { error });
      setText(content);
    } else if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      scrollToBottom();
    }

    setSending(false);
  }

  async function handleAttachPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.base64) return;

    setSending(true);

    const { data, error } = await sendMessage(conversationId, {
      message_type: 'image',
      content: asset.base64,
    });

    if (error) {
      logger.error('ConversationScreen: sendMessage image failed', { error });
    } else if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      scrollToBottom();
    }

    setSending(false);
  }

  function formatMessageTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function isImageContent(content: string): boolean {
    return content.startsWith('http') || content.startsWith('data:image');
  }

  function getImageUri(content: string): string {
    if (content.startsWith('http') || content.startsWith('data:image')) return content;
    return `data:image/jpeg;base64,${content}`;
  }

  function renderMessage({ item }: { item: Message }) {
    const isSent = currentUserId !== null && item.sender_user_id === currentUserId;

    return (
      <View style={[styles.bubbleRow, isSent ? styles.bubbleRowSent : styles.bubbleRowReceived]}>
        <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
          {item.message_type === 'image' ? (
            isImageContent(item.content) ? (
              <Image
                source={{ uri: getImageUri(item.content) }}
                style={styles.imageMessage}
                resizeMode="cover"
              />
            ) : (
              <Text style={isSent ? styles.bubbleTextSent : styles.bubbleTextReceived}>
                {t('messages.image_message')}
              </Text>
            )
          ) : (
            <Text style={isSent ? styles.bubbleTextSent : styles.bubbleTextReceived}>
              {item.content}
            </Text>
          )}
          <Text style={[styles.timeStamp, isSent ? styles.timeStampSent : styles.timeStampReceived]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{participantName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMessages}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyText}>{t('messages.empty_subtitle')}</Text>
              </View>
            }
          />

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handleAttachPhoto}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={22} color={sending ? '#CCC' : '#C9A96E'} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder={t('messages.type_message')}
              placeholderTextColor="#BBB"
              multiline
              maxLength={2000}
              returnKeyType="default"
            />

            <TouchableOpacity
              style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
  },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: { width: 40 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },
  retryButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  messageList: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: { fontSize: 14, color: '#BBB', textAlign: 'center' },

  bubbleRow: { flexDirection: 'row', marginVertical: 2 },
  bubbleRowSent: { justifyContent: 'flex-end' },
  bubbleRowReceived: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleSent: {
    backgroundColor: '#C9A96E',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  bubbleTextSent: { fontSize: 15, color: '#FFFFFF', lineHeight: 22 },
  bubbleTextReceived: { fontSize: 15, color: '#333', lineHeight: 22 },

  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },

  timeStamp: { fontSize: 10, marginTop: 4 },
  timeStampSent: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeStampReceived: { color: '#BBB' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  attachButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C9A96E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
});
