import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, profile, loading: sessionLoading } = useSession(); // Adicionado 'profile'

  console.log("[Login] render:", { sessionLoading, hasUser: !!user, hasProfile: !!profile });

  // Redirect if already logged in AND profile is loaded
  useEffect(() => {
    if (!sessionLoading && user && profile) {
      // Profile is loaded, determine the correct dashboard
      let redirectPath = "/";
      
      switch (profile.role) {
        case "SUPERADMIN":
          redirectPath = "/superadmin/dashboard";
          break;
        case "ADMIN_TENANT":
          redirectPath = "/admin/dashboard";
          break;
        case "AGENT":
          redirectPath = "/agent/leads";
          break;
      }
      
      console.log(`[Login] Redirecting to ${redirectPath} (Role: ${profile.role})`);
      navigate(redirectPath, { replace: true });
    }
    
    // If loading is false, user exists, but profile is null, we stay on the login page 
    // or let the ProtectedRoute handle the missing profile error if they navigate away.
    // For now, we just wait for the profile to resolve.
  }, [user, profile, sessionLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = showLoading("Tentando login...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showError(error.message);
        return;
      }

      // Login successful. The SessionContext listener will now fetch the profile
      // and trigger the useEffect above for redirection.
      showSuccess(`Login bem-sucedido. Redirecionando...`);
      
      // We don't navigate here; we let the useEffect handle it once the profile is loaded.

    } catch (error) {
      console.error("Login error:", error);
      showError(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro desconhecido durante o login.",
      );
    } finally {
      dismissToast(toastId);
      setIsSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Verificando sessão...</p>
      </div>
    );
  }
  
  // If user exists but profile is null, we show a loading state or wait, 
  // but since we are on the login page, we should wait for the profile to load 
  // before redirecting, which is handled by the useEffect.
  // If the user is logged in but has no profile, they will be stuck here until the profile loads (or fails).
  if (user && !profile) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Carregando perfil...</p>
        </div>
      );
  }

  // If user and profile exist, the useEffect already redirected.
  // If user is null, show the login form.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acesso ZapCorretor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;