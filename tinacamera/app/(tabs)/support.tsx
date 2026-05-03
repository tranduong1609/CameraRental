import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function SupportScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 24, marginTop: 32, marginBottom: 24 }}>Trung tâm hỗ trợ</Text>

      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.separator }}
        onPress={() => router.push('/chatbot')}
      >
        <View style={{ backgroundColor: colors.accentPinkDim, padding: 12, borderRadius: 999, marginRight: 16 }}>
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.accentPink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Hỗ trợ bằng tin nhắn tự động</Text>
          <Text style={{ color: colors.textSecondary }}>Phản hồi trong trong vài giây</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.iconDefault} />
      </TouchableOpacity>

      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.separator }}>
        <View style={{ backgroundColor: colors.accentPinkDim, padding: 12, borderRadius: 999, marginRight: 16 }}>
          <Ionicons name="call" size={24} color={colors.accentPink} />
        </View>
        <View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Gọi Hotline 0899259410</Text>
          <Text style={{ color: colors.textSecondary }}>Hoạt động từ 8h - 22h</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
