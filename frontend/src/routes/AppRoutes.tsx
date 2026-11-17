import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { RiderLayout } from '@/layouts/RiderLayout';
import { Spinner } from '@/components/ui';
import { ProtectedRoute, PublicOnlyRoute } from './guards';

// Auth
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Code-split dashboards
const CustomerHome = lazy(() => import('@/pages/customer/HomePage'));
const VendorListing = lazy(() => import('@/pages/customer/VendorListingPage'));
const VendorDetails = lazy(() => import('@/pages/customer/VendorDetailsPage'));
const ProductDetails = lazy(() => import('@/pages/customer/ProductDetailsPage'));
const Cart = lazy(() => import('@/pages/customer/CartPage'));
const Checkout = lazy(() => import('@/pages/customer/CheckoutPage'));
const MyOrders = lazy(() => import('@/pages/customer/MyOrdersPage'));
const LiveTracking = lazy(() => import('@/pages/customer/LiveTrackingPage'));
const CustomerProfile = lazy(() => import('@/pages/customer/ProfilePage'));
const Notifications = lazy(() => import('@/pages/shared/NotificationsPage'));

const VendorDashboard = lazy(() => import('@/pages/vendor/VendorDashboardPage'));
const ProductManagement = lazy(() => import('@/pages/vendor/ProductManagementPage'));
const ProductEditor = lazy(() => import('@/pages/vendor/ProductEditorPage'));
const IncomingOrders = lazy(() => import('@/pages/vendor/IncomingOrdersPage'));
const VendorOrderDetails = lazy(() => import('@/pages/vendor/VendorOrderDetailsPage'));
const VendorOrderHistory = lazy(() => import('@/pages/vendor/VendorOrderHistoryPage'));
const VendorProfile = lazy(() => import('@/pages/vendor/VendorProfilePage'));

const RiderDashboard = lazy(() => import('@/pages/rider/RiderDashboardPage'));
const AvailableDeliveries = lazy(() => import('@/pages/rider/AvailableDeliveriesPage'));
const AssignedDeliveries = lazy(() => import('@/pages/rider/AssignedDeliveriesPage'));
const DeliveryDetails = lazy(() => import('@/pages/rider/DeliveryDetailsPage'));
const LiveLocation = lazy(() => import('@/pages/rider/LiveLocationPage'));
const DeliveryHistory = lazy(() => import('@/pages/rider/DeliveryHistoryPage'));
const RiderProfile = lazy(() => import('@/pages/rider/RiderProfilePage'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const CustomerManagement = lazy(() => import('@/pages/admin/CustomerManagementPage'));
const VendorManagement = lazy(() => import('@/pages/admin/VendorManagementPage'));
const RiderManagement = lazy(() => import('@/pages/admin/RiderManagementPage'));
const OrderManagement = lazy(() => import('@/pages/admin/OrderManagementPage'));
const LiveMonitoring = lazy(() => import('@/pages/admin/LiveMonitoringPage'));
const Analytics = lazy(() => import('@/pages/admin/AnalyticsPage'));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner label="Loading…" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Authentication */}
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Customer */}
      <Route element={<ProtectedRoute roles={['customer']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Page><CustomerHome /></Page>} />
          <Route path="/vendors" element={<Page><VendorListing /></Page>} />
          <Route path="/vendors/:vendorId" element={<Page><VendorDetails /></Page>} />
          <Route path="/products/:productId" element={<Page><ProductDetails /></Page>} />
          <Route path="/cart" element={<Page><Cart /></Page>} />
          <Route path="/checkout" element={<Page><Checkout /></Page>} />
          <Route path="/orders" element={<Page><MyOrders /></Page>} />
          <Route path="/orders/:orderId" element={<Page><LiveTracking /></Page>} />
          <Route path="/notifications" element={<Page><Notifications /></Page>} />
          <Route path="/profile" element={<Page><CustomerProfile /></Page>} />
        </Route>
      </Route>

      {/* Vendor */}
      <Route path="/vendor" element={<ProtectedRoute roles={['vendor']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Page><VendorDashboard /></Page>} />
          <Route path="products" element={<Page><ProductManagement /></Page>} />
          <Route path="products/new" element={<Page><ProductEditor /></Page>} />
          <Route path="products/:productId/edit" element={<Page><ProductEditor /></Page>} />
          <Route path="orders" element={<Page><IncomingOrders /></Page>} />
          <Route path="orders/history" element={<Page><VendorOrderHistory /></Page>} />
          <Route path="orders/:orderId" element={<Page><VendorOrderDetails /></Page>} />
          <Route path="notifications" element={<Page><Notifications /></Page>} />
          <Route path="profile" element={<Page><VendorProfile /></Page>} />
        </Route>
      </Route>

      {/* Rider */}
      <Route path="/rider" element={<ProtectedRoute roles={['rider']} />}>
        <Route element={<RiderLayout />}>
          <Route index element={<Page><RiderDashboard /></Page>} />
          <Route path="available" element={<Page><AvailableDeliveries /></Page>} />
          <Route path="deliveries" element={<Page><AssignedDeliveries /></Page>} />
          <Route path="deliveries/:orderId" element={<Page><DeliveryDetails /></Page>} />
          <Route path="location" element={<Page><LiveLocation /></Page>} />
          <Route path="history" element={<Page><DeliveryHistory /></Page>} />
          <Route path="notifications" element={<Page><Notifications /></Page>} />
          <Route path="profile" element={<Page><RiderProfile /></Page>} />
        </Route>
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Page><AdminDashboard /></Page>} />
          <Route path="customers" element={<Page><CustomerManagement /></Page>} />
          <Route path="vendors" element={<Page><VendorManagement /></Page>} />
          <Route path="riders" element={<Page><RiderManagement /></Page>} />
          <Route path="orders" element={<Page><OrderManagement /></Page>} />
          <Route path="monitoring" element={<Page><LiveMonitoring /></Page>} />
          <Route path="analytics" element={<Page><Analytics /></Page>} />
          <Route path="notifications" element={<Page><Notifications /></Page>} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
