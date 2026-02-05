import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AboutPage from "./pages/AboutPage";
import WishlistPage from "./pages/WishlistPage";
import NotFound from "./pages/NotFound";
import WhatsAppButton from "@/components/WhatsAppButton";

// Admin imports
import AdminLayout from "@/components/admin/AdminLayout";
import {
  AdminLoginPage,
  AdminDashboardPage,
  AdminProductsPage,
  AdminCategoriesPage,
  AdminStockPage,
  AdminBannersPage,
  AdminUsersPage,
  AdminSettingsPage,
  AdminBlingPage,
} from "./pages/admin";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/produtos" element={<ProductsPage />} />
                <Route path="/produto/:id" element={<ProductDetailPage />} />
                <Route path="/carrinho" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/sobre" element={<AboutPage />} />
                <Route path="/favoritos" element={<WishlistPage />} />
                
                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="stock" element={<AdminStockPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="banners" element={<AdminBannersPage />} />
                  <Route path="coupons" element={<AdminCouponsPage />} />
                  <Route path="reviews" element={<AdminReviewsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="bling" element={<AdminBlingPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <WhatsAppButton />
            </BrowserRouter>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
