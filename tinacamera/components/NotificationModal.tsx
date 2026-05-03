import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { notificationApi } from '../services/api';

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  is_read: boolean;
  createdAt: string;
  booking_id?: string;
  type?: string;
}

export const NotificationBell = ({ onPress }: { onPress: () => void }) => {
  const { token, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notificationApi.getNotifications(token);
      if (res.ok && res.data?.notifications) {
        const count = res.data.notifications.filter(n => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (e) {}
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnread();
      // Polling every 1 minute
      const interval = setInterval(fetchUnread, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnread]);

  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 8, position: 'relative' }}>
      <Ionicons name="notifications-outline" size={24} color="#ebe0e2" />
      {unreadCount > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const NotificationModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notificationApi.getNotifications(token);
      if (res.ok && res.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (e) {}
  }, [token]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    }
  }, [visible, fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications().finally(() => setRefreshing(false));
  };

  const handleRead = async (id: string, is_read: boolean, booking_id?: string) => {
    if (!is_read && token) {
      try {
        await notificationApi.markAsRead(token, id);
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n));
      } catch (e) {}
    }
    // TODO: Navigation to booking detail if booking_id exists
    // (This requires passing navigation prop or using router)
    console.log('Navigate to booking: ', booking_id);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[s.item, !item.is_read && s.itemUnread]}
      onPress={() => handleRead(item._id, item.is_read, item.booking_id)}
    >
      <View style={s.iconContainer}>
        <Ionicons 
          name={item.type === 'pickup_reminder' ? 'camera' : item.type === 'return_reminder' ? 'time' : 'notifications'} 
          size={20} 
          color="#f9b4d2" 
        />
      </View>
      <View style={s.contentContainer}>
        <Text style={[s.title, !item.is_read && s.titleUnread]}>{item.title}</Text>
        <Text style={s.body}>{item.body}</Text>
        <Text style={s.time}>{getTimeAgo(item.createdAt)}</Text>
      </View>
      {!item.is_read && <View style={s.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={s.modalContainer}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Thông báo</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color="#ebe0e2" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={notifications}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9b4d2" />}
            ListEmptyComponent={
              !loading ? (
                <Text style={s.emptyText}>Chưa có thông báo nào.</Text>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3f3f46',
  },
  headerTitle: { color: '#ebe0e2', fontSize: 18, fontWeight: '700' },
  closeBtn: { position: 'absolute', right: 20 },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyText: { color: '#d4c2c8', textAlign: 'center', marginTop: 40 },
  item: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2a2a35',
    borderRadius: 16,
    marginBottom: 12,
  },
  itemUnread: {
    backgroundColor: '#3b2b34',
    borderLeftWidth: 3,
    borderLeftColor: '#f9b4d2',
  },
  iconContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f9b4d220',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: { flex: 1, justifyContent: 'center' },
  title: { color: '#ebe0e2', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  titleUnread: { fontWeight: '700', color: '#f9b4d2' },
  body: { color: '#d4c2c8', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  time: { color: '#8E8E93', fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9b4d2', alignSelf: 'center', marginLeft: 8 },
});
