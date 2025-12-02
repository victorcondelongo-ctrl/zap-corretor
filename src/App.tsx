import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LeadsPage from "./pages/admin/LeadsPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import Login from "./pages/Login";
import { SessionContextProvider } from "./contexts/SessionContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import MyLeadsPage from "./pages/agent/MyLeadsPage";
import SuperadminLayout from "./components/layout/SuperadminLayout";
import SuperadminDashboardPage from "./pages/superadmin/SuperadminDashboardPage";
import SuperadminTenantsPage from "./pages/superadmin/SuperadminTenantsPage";
import SuperadminPlansPage from "./pages/superadmin/SuperadminPlansPage";
import SuperadminIntegrationsPage from "./pages/superadmin/SuperadminIntegrationsPage";
import SuperadminSettingsPage from "./pages/superadmin/SuperadminSettingsPage";
import SuperadminTenantDetailPage from "./pages/superadmin/SuperadminTenantDetailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* SUPERADMIN ROUTES - Wrapped in Layout */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={["SUPERADMIN"]}>
                  <SuperadminLayout>
                    <Outlet />
                  </SuperadminLayout>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<SuperadminDashboardPage />} />
              <Route path="tenants" element={<SuperadminTenantsPage />} />
              <Route path="tenants/:id" element={<SuperadminTenantDetailPage />} />
              <Route path="plans" element={<SuperadminPlansPage />} />
              <Route path="integrations" element={<SuperadminIntegrationsPage />} />
              <Route path="settings" element={<SuperadminSettingsPage />} />
            </Route>

            {/* ADMIN ROUTES */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["ADMIN_TENANT"]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leads"
              element={
                <ProtectedRoute allowedRoles={["ADMIN_TENANT"]}>
                  <LeadsPage />
                </ProtectedRoute>
              }
            />
            {/* AGENT ROUTES */}
            <Route
              path="/agent/leads"
              element={
                <ProtectedRoute allowedRoles={["AGENT"]}>
                  <MyLeadsPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;