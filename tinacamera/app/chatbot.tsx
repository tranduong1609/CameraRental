import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { chatApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'bot',
  text: 'Xin chào! 👋 Tôi là TinaBot, trợ lý tư vấn của TinaCamera.\n\nBạn cần tư vấn về máy ảnh, ống kính, hay phụ kiện gì không? Hãy hỏi tôi nhé! 📷',
};

const QUICK_QUESTIONS = [
  'Tôi muốn thuê máy ảnh chụp chân dung',
  'Giá thuê máy ảnh bao nhiêu?',
  'Có những loại máy ảnh nào?',
  'Khi thuê cần đặt cọc bao nhiêu?',
];

export default function ChatBotScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: msgText,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history (skip welcome message)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, text: m.text }));

      const res = await chatApi.sendMessage(msgText, history);

      if (res.ok && res.data?.reply) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          text: res.data.reply,
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        // Backend now sends a specific message for 429 errors
        const errorMessage = res.message || 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại hoặc gọi hotline 0899259410 nhé! 📞';
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            text: errorMessage,
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          text: 'Vui lòng chờ khoảng 30 giây rồi thử lại, vì hệ thống đang xử lý quá nhiều yêu cầu (Lỗi giới hạn Google API). 🔌',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const showQuickQuestions = messages.length <= 1;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.separator },
    headerBack: { marginRight: 12 },
    headerIconBox: { backgroundColor: colors.primary + '20', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitleBox: { flex: 1 },
    headerTitle: { color: colors.text, fontWeight: '700', fontSize: 18 },
    headerStatus: { color: '#10B981', fontSize: 12 },
    scrollContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    msgContainer: { marginBottom: 12, maxWidth: '85%' },
    msgUser: { alignSelf: 'flex-end' },
    msgBot: { alignSelf: 'flex-start' },
    botHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    botHeaderIcon: { backgroundColor: colors.primary + '20', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    botHeaderName: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
    msgBubbleUser: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderBottomRightRadius: 4 },
    msgBubbleBot: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderBottomLeftRadius: 4 },
    msgTextUser: { color: colors.onPrimary, fontSize: 14, lineHeight: 20 },
    msgTextBot: { color: colors.text, fontSize: 14, lineHeight: 20 },
    typingIndicatorBox: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center' },
    typingText: { color: colors.textMuted, fontSize: 14, marginLeft: 8 },
    quickQContainer: { marginTop: 8, marginBottom: 16 },
    quickQLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500', marginBottom: 8, marginLeft: 4 },
    quickQBtn: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
    quickQText: { color: colors.primary, fontSize: 14 },
    inputBar: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.separator, backgroundColor: colors.background },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.cardBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: 16, paddingVertical: 8 },
    input: { flex: 1, color: colors.text, fontSize: 14, maxHeight: 96, minHeight: 24, paddingTop: Platform.OS === 'ios' ? 8 : 4 },
    sendBtn: { marginLeft: 8, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    sendBtnActive: { backgroundColor: colors.primary },
    sendBtnDisabled: { backgroundColor: colors.surfaceContainerHigh },
  }), [colors]);

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerIconBox}>
          <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
        </View>
        <View style={s.headerTitleBox}>
          <Text style={s.headerTitle}>TinaBot</Text>
          <Text style={s.headerStatus}>● Đang hoạt động</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={s.scrollContainer}
          contentContainerStyle={{ paddingBottom: 16 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[s.msgContainer, msg.role === 'user' ? s.msgUser : s.msgBot]}
            >
              {msg.role === 'bot' && (
                <View style={s.botHeaderRow}>
                  <View style={s.botHeaderIcon}>
                    <Ionicons name="chatbubble-ellipses" size={12} color={colors.primary} />
                  </View>
                  <Text style={s.botHeaderName}>TinaBot</Text>
                </View>
              )}
              <View style={msg.role === 'user' ? s.msgBubbleUser : s.msgBubbleBot}>
                <Text style={msg.role === 'user' ? s.msgTextUser : s.msgTextBot}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <View style={[s.msgContainer, s.msgBot]}>
              <View style={s.botHeaderRow}>
                <View style={s.botHeaderIcon}>
                  <Ionicons name="chatbubble-ellipses" size={12} color={colors.primary} />
                </View>
                <Text style={s.botHeaderName}>TinaBot</Text>
              </View>
              <View style={s.typingIndicatorBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s.typingText}>Đang suy nghĩ...</Text>
              </View>
            </View>
          )}

          {/* Quick questions */}
          {showQuickQuestions && (
            <View style={s.quickQContainer}>
              <Text style={s.quickQLabel}>Gợi ý câu hỏi:</Text>
              {QUICK_QUESTIONS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.quickQBtn}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={s.quickQText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={s.inputBar}>
          <View style={s.inputContainer}>
            <TextInput
              style={s.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!isLoading}
              onSubmitEditing={() => sendMessage()}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[s.sendBtn, input.trim() && !isLoading ? s.sendBtnActive : s.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || isLoading}
            >
              <Ionicons
                name="send"
                size={16}
                color={input.trim() && !isLoading ? colors.onPrimary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
