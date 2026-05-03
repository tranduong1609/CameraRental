const BASE_URL = 'http://localhost:5000/api';

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
  getCategories: () =>
    request<{ categories: any[] }>('/cameras/categories'),

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

  getCameraDetail: (id: string) =>
    request<{ camera: any; reviews: any[] }>(`/cameras/${id}`),
};

// ─────────────────────────────────────
//  Booking API
// ─────────────────────────────────────
export const bookingApi = {
  getMyBookings: (token: string) =>
    request<{ bookings: any[] }>('/bookings/my', {
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
//  Payment API
// ─────────────────────────────────────
export const paymentApi = {
  // SePay - QR ngân hàng
  createSepay: (data: { booking_id: string; amount: number; orderInfo?: string }) =>
    request<{ payUrl: string; qrCodeUrl: string; transactionId: string }>('/payment/sepay/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkSepay: (transactionId: string) =>
    request<{ status: string }>(`/payment/sepay/check/${transactionId}`),

  // VNPay
  createVnpay: (data: { booking_id: string; amount: number; orderInfo?: string }) =>
    request<{ payUrl: string; transactionId: string }>('/payment/vnpay/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Status polling
  checkStatus: (transactionId: string) =>
    request<{ status: string }>(`/payment/status/${transactionId}`),
};

// ─────────────────────────────────────
//  Admin API
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

  createCamera: (token: string, data: any, files: File[] = []) => {
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
    files.forEach((file) => {
      formData.append('images', file);
    });
    return uploadData<{ camera: any; message: string }>('/admin/cameras', formData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  updateCamera: (token: string, id: string, data: any, files: File[] = []) => {
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
    files.forEach((file) => {
      formData.append('images', file);
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
//  Super Admin API
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
