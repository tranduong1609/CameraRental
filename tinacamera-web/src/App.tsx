import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminLayout from './components/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminInventoryPage from './pages/AdminInventoryPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import SuperAdminLayout from './components/SuperAdminLayout';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import SuperAdminUsersPage from './pages/SuperAdminUsersPage';
import SuperAdminSettingsPage from './pages/SuperAdminSettingsPage';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 72px)' }}>{children}</main>
      <Footer />
      <Chatbot />
    </>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Auth pages - no navbar/footer */}
            <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
            <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />

            {/* Main pages */}
            <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
            <Route path="/products" element={<AppLayout><ProductsPage /></AppLayout>} />
            <Route path="/product/:id" element={<AppLayout><ProductDetailPage /></AppLayout>} />
            <Route path="/cart" element={<AppLayout><CartPage /></AppLayout>} />
            <Route path="/orders" element={<AppLayout><OrdersPage /></AppLayout>} />
            <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />

            {/* Admin (Store Owner) routes */}
            <Route path="/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
            <Route path="/admin/inventory" element={<AdminLayout><AdminInventoryPage /></AdminLayout>} />
            <Route path="/admin/orders" element={<AdminLayout><AdminOrdersPage /></AdminLayout>} />
            <Route path="/admin/reviews" element={<AdminLayout><AdminReviewsPage /></AdminLayout>} />

            {/* Super Admin routes */}
            <Route path="/superadmin" element={<SuperAdminLayout><SuperAdminDashboardPage /></SuperAdminLayout>} />
            <Route path="/superadmin/users" element={<SuperAdminLayout><SuperAdminUsersPage /></SuperAdminLayout>} />
            <Route path="/superadmin/settings" element={<SuperAdminLayout><SuperAdminSettingsPage /></SuperAdminLayout>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
