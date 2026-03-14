import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import ReceiptListPage from "@/pages/ReceiptListPage";
import ReceiptFormPage from "@/pages/ReceiptFormPage";
import DeliveryListPage from "@/pages/DeliveryListPage";
import DeliveryFormPage from "@/pages/DeliveryFormPage";
import StockPage from "@/pages/StockPage";
import MoveHistoryPage from "@/pages/MoveHistoryPage";
import AdjustmentPage from "@/pages/AdjustmentPage";
import WarehousePage from "@/pages/WarehousePage";
import LocationPage from "@/pages/LocationPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="operations/receipts" element={<ReceiptListPage />} />
              <Route path="operations/receipts/:id" element={<ReceiptFormPage />} />
              <Route path="operations/deliveries" element={<DeliveryListPage />} />
              <Route path="operations/deliveries/:id" element={<DeliveryFormPage />} />
              <Route path="operations/adjustments" element={<AdjustmentPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="move-history" element={<MoveHistoryPage />} />
              <Route path="settings/warehouses" element={<WarehousePage />} />
              <Route path="settings/locations" element={<LocationPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
