import React from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import { ZapRole } from "@/services/zapCorretor";
import { Loader2, ShieldOff } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles: ZapRole[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, profile, loading } = useSession();

  console.log("[ProtectedRoute] render:", {
    allowedRoles,
    loading,
    hasUser: !!user,
    role: profile?.role,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando sessão...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    // Não entra em loop, apenas mostra erro claro
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <ShieldOff className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Erro ao carregar perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Não foi possível carregar seus dados de perfil. Verifique se existe um registro na tabela
            <code> profiles </code> para esse usuário.
          </p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <ShieldOff className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Acesso negado
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;