import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { getCurrentProfile } from "@/services/zapCorretor";
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
  const { user, loading: sessionLoading } = useSession();

  // Redirect if already logged in
  useEffect(() => {
    if (!sessionLoading && user) {
      // We need to fetch the profile to determine the correct dashboard
      const checkRoleAndRedirect = async () => {
        try {
          const profile = await getCurrentProfile();
          if (profile.role === "ADMIN_TENANT") {
            navigate("/admin/dashboard", { replace: true });
          } else if (profile.role === "AGENT") {
            navigate("/agent/leads", { replace: true });
          } else if (profile.role === "SUPERADMIN") {
            navigate("/superadmin/dashboard", { replace: true });
          } else {
            // Handle unknown roles
            navigate("/", { replace: true });
          }
        } catch (e) {
          console.error("Error checking profile during login redirect:", e);
          // If profile check fails, redirect to home
          navigate("/", { replace: true });
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, sessionLoading, navigate]);

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

      // Manually fetch profile to determine immediate redirection path
      const profile = await getCurrentProfile();
      showSuccess(`Bem-vindo(a), ${profile.full_name}!`);

      if (profile.role === "ADMIN_TENANT") {
        navigate("/admin/dashboard", { replace: true });
      } else if (profile.role === "AGENT") {
        navigate("/agent/leads", { replace: true });
      } else if (profile.role === "SUPERADMIN") {
        navigate("/superadmin/dashboard", { replace: true });
      } else {
        // Handle unknown roles
        navigate("/", { replace: true });
      }
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

  if (sessionLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Verificando sessão...</p>
      </div>
    );
  }

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