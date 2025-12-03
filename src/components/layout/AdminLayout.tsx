import React from "react";
import AdminSidebar from "./AdminSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { profile } = useSession();
  
  const tenantName = profile?.tenant_name || "Corretora";

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-soft/50 dark:bg-gray-900">
        <header className="flex items-center justify-between p-4 border-b bg-background">
          <h1 className="text-lg font-bold text-brand">Admin: {tenantName}</h1>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 sm:w-72">
              <AdminSidebar />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-grow overflow-y-auto bg-background">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-brand-soft/50 dark:bg-gray-900">
      <aside className="w-64 flex-shrink-0">
        <AdminSidebar />
      </aside>
      <main className="flex-grow overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;