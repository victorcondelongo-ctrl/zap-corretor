import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Link, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LeadsPage from "./pages/admin/LeadsPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminAgentsPage from "./pages/admin/AdminAgentsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminBlockedPhonesPage from "./pages/admin/AdminBlockedPhonesPage";
import AdminWhatsappPage from "./pages/admin/AdminWhatsappPage"; // Import new page
import Login from "./pages/Login";
import { SessionContextProvider, useSession } from "./contexts/SessionContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import MyLeadsPage from "./pages/agent/MyLeadsPage";
import AgentSettingsPage from "./pages/agent/AgentSettingsPage";
import AgentProfilePage from "./pages/agent/AgentProfilePage";
import AgentDashboardPage from "./pages/agent/AgentDashboardPage"; // Import new dashboard
import SuperadminLayout from "./components/layout/SuperadminLayout";
import AdminLayout from "./components/layout/AdminLayout";
import SuperadminDashboardPage from "./pages/superadmin/SuperadminDashboardPage";
import SuperadminTenantsPage from "./pages/superadmin/SuperadminTenantsPage";
import SuperadminPlansPage from "./pages/superadmin/SuperadminPlansPage";
import SuperadminIntegrationsPage from "./pages/superadmin/SuperadminIntegrationsPage";
import SuperadminSettingsPage from "./pages/superadmin/SuperadminSettingsPage";
import SuperadminTenantDetailPage from "./pages/superadmin/SuperadminTenantDetailPage";
import SuperadminSupportPage from "./pages/superadmin/SuperadminSupportPage"; // Import new page
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import WhatsAppStatusBadge from "@/components/shared/WhatsAppStatusBadge"; // Import the new component

const queryClient = new QueryClient();

// Handler de Logout
const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Falha ao sair: " + error.message);
    } else {
      showSuccess("Sessão encerrada.");
    }
};

// Layout simples para o Agente (com navegação atualizada)
const AgentLayout = () => {
  const { profile } = useSession();
  const agentName = profile?.full_name || "Corretor";
  
  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b shadow-sm">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-primary">ZapCorretor - Agente ({agentName})</h1>
          <div className="space-x-4 flex items-center">
            <Link to="/agent/dashboard" className="text-sm font-medium hover:text-primary">Dashboard</Link>
            <Link to="/agent/leads" className="text-sm font-medium hover:text-primary">Meus Leads</Link>
            <Link to="/agent/settings" className="text-sm font-medium hover:text-primary">Configurações</Link>
            <Link to="/agent/profile" className="text-sm font-medium hover:text-primary">Perfil</Link>
            {/* WhatsApp Status Badge for Agent */}
            <WhatsAppStatusBadge />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-sm font-medium text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto pb-10">
        <Outlet />
      </main>
    </div>
  );
};


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
              <Route path="support" element={<SuperadminSupportPage />} /> {/* New Route */}
            </Route>

            {/* ADMIN TENANT ROUTES - Wrapped in Layout */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["ADMIN_TENANT"]}>
                  <AdminLayout>
                    <Outlet />
                  </AdminLayout>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="agents" element={<AdminAgentsPage />} />
              <Route path="whatsapp" element={<AdminWhatsappPage />} /> {/* New Route */}
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="blocked-phones" element={<AdminBlockedPhonesPage />} />
              {/* Removed: <Route path="reports" element={<AdminReportsPage />} /> */}
            </Route>

            {/* AGENT ROUTES - Wrapped in simple AgentLayout */}
            <Route
              path="/agent"
              element={
                <ProtectedRoute allowedRoles={["AGENT"]}>
                  <AgentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} /> {/* Redirect /agent to /agent/dashboard */}
              <Route path="dashboard" element={<AgentDashboardPage />} />
              <Route path="leads" element={<MyLeadsPage />} />
              <Route path="settings" element={<AgentSettingsPage />} />
              <Route path="profile" element={<AgentProfilePage />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;