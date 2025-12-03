import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building,
  DollarSign,
  Settings,
  Plug,
  LogOut,
  LifeBuoy, // Import LifeBuoy icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { title: "Corretoras", href: "/superadmin/tenants", icon: Building },
  { title: "Planos e Limites", href: "/superadmin/plans", icon: DollarSign },
  { title: "Integrações", href: "/superadmin/integrations", icon: Plug },
  { title: "Configurações Globais", href: "/superadmin/settings", icon: Settings },
  { title: "Tickets de Suporte", href: "/superadmin/support", icon: LifeBuoy }, // New item
];

const SuperadminSidebar: React.FC = () => {
  const location = useLocation();

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
        <h1 className="text-xl font-bold text-sidebar-primary">ZapCorretor SA</h1>
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
                "flex items-center gap-3 rounded-md p-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
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
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-md p-3 text-sm font-medium w-full text-left text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
};

export default SuperadminSidebar;