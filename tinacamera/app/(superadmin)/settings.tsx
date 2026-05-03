import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function SuperAdminSettings() {
  const { colors } = useTheme();

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
    text: { color: colors.text },
  }), [colors]);

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.text}>Tính năng cài đặt hệ thống (Đang phát triển)</Text>
    </SafeAreaView>
  );
}
