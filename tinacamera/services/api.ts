import { Platform } from 'react-native';

// Điện thoại thật không thể dùng localhost/10.0.2.2
// → Dùng IP LAN của máy tính (cùng mạng WiFi)
// Web trên máy tính → dùng localhost bình thường
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  // Android/iOS (điện thoại thật hoặc emulator)
  return 'http://192.168.1.14:5000/api';
};

const BASE_URL = getBaseUrl();

// ─────────────────────────────────────
//  Helper: gọi API
// ─────────────────────────────────────
interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, message: data.message || 'Đã xảy ra lỗi.' };
    }

    return { ok: true, data };
  } catch (error: any) {
    console.error('API Error:', error);
    return { ok: false, message: 'Không thể kết nối đến server.' };
  }
}

// Hàm hỗ trợ upload FormData (chứa file/hình ảnh)
async function uploadData<T>(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      ...options,
      headers: {
        // KHÔNG Cài 'Content-Type': 'application/json' ở đây. Fetch sẽ tự tính ra content loại Form Data
        ...options.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, message: data.message || 'Lỗi upload api.' };
    }

    return { ok: true, data };
  } catch (error: any) {
    console.error('API Upload Error:', error);
    return { ok: false, message: 'Lỗi mạng nội bộ.' };
  }
}

// ─────────────────────────────────────
//  Auth API
// ─────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (full_name: string, email: string, password: string) =>
    request<{ token?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, password }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  googleLogin: (idToken: string) =>
    request<{ token: string, user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  facebookLogin: (accessToken: string) =>
    request<{ token: string, user: any }>('/auth/facebook', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  clerkLogin: (clerkSessionId: string) =>
    request<{ token: string, user: any }>('/auth/clerk', {
      method: 'POST',
      body: JSON.stringify({ clerkSessionId }),
    }),

  getProfile: (token: string) =>
    request<{ user: any }>('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateProfile: (token: string, data: { full_name?: string; phone?: string; email?: string }) =>
    request<{ user: any }>('/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
};

// ─────────────────────────────────────
//  Camera API
// ─────────────────────────────────────
export const cameraApi = {
  // Lấy danh sách danh mục
  getCategories: () =>
    request<{ categories: any[] }>('/cameras/categories'),

  // Lấy danh sách sản phẩm (hỗ trợ filter)
  getCameras: (params?: {
    category?: string;
    brand?: string;
    search?: string;
    sort?: string;
    min_price?: number;
    max_price?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const queryStr = query.toString();
    return request<{ cameras: any[]; pagination: any }>(`/cameras${queryStr ? `?${queryStr}` : ''}`);
  },

  // Lấy chi tiết 1 sản phẩm
  getCameraDetail: (id: string) =>
    request<{ camera: any; reviews: any[] }>(`/cameras/${id}`),

  // ============================================
  // QUẢN LÝ DÀNH CHO ADMIN
  // ============================================
  // Tạo sản phẩm mới kèm hình ảnh.
  // localImageUris: Mảng đường dẫn ảnh nhận được từ expo-image-picker
  createCamera: (cameraData: any, localImageUris: string[]) => {
    const formData = new FormData();

    // Đưa payload thường vào form
    Object.keys(cameraData).forEach(key => {
      if (cameraData[key] !== undefined) {
        if (typeof cameraData[key] === 'object') {
          formData.append(key, JSON.stringify(cameraData[key]));
        } else {
          formData.append(key, String(cameraData[key]));
        }
      }
    });

    // Thêm file hình ảnh vào form gửi đi
    localImageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      // Cú pháp đặc thù của React Native để upload file File/Blob
      formData.append('images', {
        uri,
        name: filename,
        type,
      } as any);
    });

    return uploadData<{ camera: any }>('/cameras', formData);
  },

  // Upload thêm nhiều hình ảnh vào 1 sản phẩm cụ thể
  addImagesToCamera: (id: string, localImageUris: string[]) => {
    const formData = new FormData();

    localImageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('images', {
        uri,
        name: filename,
        type,
      } as any);
    });

    return uploadData<{ images: string[] }>(`/cameras/${id}/images`, formData);
  },
};

// ─────────────────────────────────────
//  Chat API
// ─────────────────────────────────────
export const chatApi = {
  sendMessage: (message: string, history: { role: string; text: string }[] = []) =>
    request<{ reply: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
};

// ─────────────────────────────────────
//  Booking API
// ─────────────────────────────────────
export const bookingApi = {
  getMyBookings: (token: string) =>
    request<{ bookings: any[] }>('/bookings/my', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getBookingDetail: (token: string, id: string) =>
    request<{ booking: any }>(`/bookings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createBooking: (token: string, data: {
    camera_id: string;
    start_date: string;
    end_date: string;
    payment_type?: string;
    customer_info?: { full_name?: string; phone?: string; email?: string };
    note?: string;
  }) =>
    request<{ booking: any; message: string }>('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  cancelBooking: (token: string, id: string) =>
    request<{ booking: any; message: string }>(`/bookings/${id}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }),

  submitReview: (token: string, bookingId: string, rating: number, comment?: string) =>
    request<{ review: any; message: string }>(`/bookings/${bookingId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating, comment }),
    }),
};

// ─────────────────────────────────────
//  Admin API (Chủ cửa hàng)
// ─────────────────────────────────────
export const adminApi = {
  getStats: (token: string) =>
    request<any>('/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getRevenue: (token: string, period: 'all' | 'day' | 'week' | 'month' | 'custom' = 'day', startDate?: string, endDate?: string) => {
    let url = `/admin/revenue?period=${period}`;
    if (period === 'custom' && startDate) url += `&start_date=${startDate}`;
    if (period === 'custom' && endDate) url += `&end_date=${endDate}`;
    return request<any>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getBookings: (token: string, status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    const query = params.toString();
    return request<{ bookings: any[] }>(`/admin/bookings${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getBookingDetail: (token: string, id: string) =>
    request<{ booking: any }>(`/admin/bookings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateBookingStatus: (token: string, id: string, status: string) =>
    request<{ booking: any; message: string }>(`/admin/bookings/${id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),

  scanCccd: (token: string, bookingId: string, cccd_info: any) =>
    request<{ booking: any; message: string }>(`/admin/bookings/${bookingId}/cccd`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cccd_info }),
    }),

  confirmPickup: (token: string, bookingId: string, cccd_info?: any) =>
    request<{ booking: any; message: string }>(`/admin/bookings/${bookingId}/pickup`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cccd_info }),
    }),

  confirmReturn: (token: string, bookingId: string) =>
    request<{ booking: any; message: string }>(`/admin/bookings/${bookingId}/return`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getCameras: (token: string) =>
    request<{ cameras: any[] }>('/admin/cameras', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createCamera: (token: string, data: any, localImageUris: string[] = []) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (typeof data[key] === 'object') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, String(data[key]));
        }
      }
    });
    localImageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('images', { uri, name: filename, type } as any);
    });
    return uploadData<{ camera: any; message: string }>('/admin/cameras', formData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  updateCamera: (token: string, id: string, data: any, localImageUris: string[] = []) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (typeof data[key] === 'object') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, String(data[key]));
        }
      }
    });
    localImageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('images', { uri, name: filename, type } as any);
    });
    return uploadData<{ camera: any; message: string }>(`/admin/cameras/${id}`, formData, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  deleteCamera: (token: string, id: string) =>
    request<{ message: string }>(`/admin/cameras/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  // ── Reviews ──
  getReviews: (token: string, filters?: { rating?: number; replied?: string; camera_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.rating) params.append('rating', String(filters.rating));
    if (filters?.replied) params.append('replied', filters.replied);
    if (filters?.camera_id) params.append('camera_id', filters.camera_id);
    const query = params.toString();
    return request<{ reviews: any[]; stats: any }>(`/admin/reviews${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  replyReview: (token: string, reviewId: string, reply_comment: string) =>
    request<{ review: any; message: string }>(`/admin/reviews/${reviewId}/reply`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reply_comment }),
    }),

  toggleReviewVisibility: (token: string, reviewId: string, is_visible: boolean) =>
    request<{ review: any; message: string }>(`/admin/reviews/${reviewId}/visibility`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_visible }),
    }),
};

// ─────────────────────────────────────
//  Super Admin API (Quản trị hệ thống)
// ─────────────────────────────────────
export const superAdminApi = {
  getUsers: (token: string, search?: string, role?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role && role !== 'all') params.append('role', role);
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString();
    return request<{ users: any[]; stats: any }>(`/superadmin/users${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateUserRole: (token: string, id: string, role: string) =>
    request<{ message: string; user: any }>(`/superadmin/users/${id}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    }),

  toggleUserStatus: (token: string, id: string, is_active: boolean) =>
    request<{ message: string; user: any }>(`/superadmin/users/${id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active }),
    }),
};

// ─────────────────────────────────────
//  Notification API
// ─────────────────────────────────────
export const notificationApi = {
  getNotifications: (token: string) =>
    request<{ notifications: any[]; ok: boolean }>('/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  markAsRead: (token: string, id: string) =>
    request<{ message: string; ok: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }),

  savePushToken: (token: string, pushToken: string) =>
    request<{ message: string; ok: boolean }>('/notifications/token', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: pushToken }),
    }),
};
