import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  ShieldOff,
  MessageSquare,
  LogOut,
  Zap, // Added Zap icon for WhatsApp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/contexts/SessionContext";
import WhatsAppStatusBadge from "@/components/shared/WhatsAppStatusBadge"; // Import the new component

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/admin/leads", icon: MessageSquare },
  { title: "Gestão de Corretores", href: "/admin/agents", icon: Users },
  { title: "WhatsApp Central", href: "/admin/whatsapp", icon: Zap }, // New item
  { title: "Configurações", href: "/admin/settings", icon: Settings },
  { title: "Telefones Bloqueados", href: "/admin/blocked-phones", icon: ShieldOff },
  // Removed: { title: "Relatórios", href: "/admin/reports", icon: BarChart },
];

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const { profile } = useSession();
  
  const tenantName = profile?.tenant_name || "Corretora";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Falha ao sair: " + error.message);
    } else {
      showSuccess("Sessão encerrada.");
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-brand truncate" title={tenantName}>
            {tenantName}
        </h1>
      </div>
      <nav className="flex-grow p-2 space-y-1">
        {navItems.map((item) => {
          // Use startsWith to highlight parent links when viewing detail pages
          const isActive = location.pathname.startsWith(item.href); 
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-brand text-brand-foreground hover:bg-brand/90 shadow-md"
                  : "hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t">
        {/* WhatsApp Status Badge for Admin */}
        <div className="mb-2">
            <WhatsAppStatusBadge className="w-full justify-center" />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium w-full text-left text-destructive hover:bg-destructive/10 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;