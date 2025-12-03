import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import SignupForm from "@/components/auth/SignupForm";
import PasswordRecoveryForm from "@/components/auth/PasswordRecoveryForm";
import NewPasswordForm from "@/components/auth/NewPasswordForm";
import SupportForm from "@/components/auth/SupportForm";

type View = 'login' | 'signup' | 'recover' | 'support' | 'new-password';

// Componente de Login original, agora encapsulado para ser usado no switch
interface LoginFormProps {
    onViewChange: (view: View) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onViewChange }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

            showSuccess(`Login bem-sucedido. Redirecionando...`);
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

    return (
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
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword((prev) => !prev)}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>
                </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    "Entrar"
                )}
            </Button>

            <div className="flex justify-between text-sm mt-4">
                <Button variant="link" type="button" onClick={() => onViewChange('recover')} className="p-0 h-auto text-primary hover:text-primary/80">
                    Esqueceu sua senha?
                </Button>
                <Button variant="link" type="button" onClick={() => onViewChange('support')} className="p-0 h-auto text-muted-foreground hover:text-primary">
                    Precisa de ajuda? Suporte
                </Button>
            </div>
            
            <div className="text-center pt-4 border-t">
                <Button variant="link" type="button" onClick={() => onViewChange('signup')} className="text-sm">
                    Não tem uma conta? Cadastre-se
                </Button>
            </div>
        </form>
    );
};


const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: sessionLoading } = useSession();
  
  // Check URL hash for recovery token on load
  const hash = location.hash;
  const initialView: View = hash.includes('type=recovery') ? 'new-password' : 'login';
  
  const [currentView, setCurrentView] = useState<View>(initialView);

  // Redirect if already logged in AND profile is loaded
  useEffect(() => {
    if (!sessionLoading && user && profile) {
      let redirectPath = "/";
      
      switch (profile.role) {
        case "SUPERADMIN":
          redirectPath = "/superadmin/dashboard";
          break;
        case "ADMIN_TENANT":
          redirectPath = "/admin/dashboard";
          break;
        case "AGENT":
          redirectPath = "/agent/dashboard";
          break;
      }
      
      console.log(`[Login] Redirecting to ${redirectPath} (Role: ${profile.role})`);
      navigate(redirectPath, { replace: true });
    }
  }, [user, profile, sessionLoading, navigate]);

  // Handle loading states
  if (sessionLoading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">
            {sessionLoading ? "Verificando sessão..." : "Carregando perfil..."}
        </p>
      </div>
    );
  }
  
  // If user and profile exist, the useEffect already redirected.
  // If user is null, show the appropriate form based on currentView.
  
  const renderForm = () => {
    switch (currentView) {
        case 'login':
            return <LoginForm onViewChange={setCurrentView} />;
        case 'signup':
            return <SignupForm onLoginClick={() => setCurrentView('login')} />;
        case 'recover':
            return <PasswordRecoveryForm onLoginClick={() => setCurrentView('login')} />;
        case 'new-password':
            return <NewPasswordForm onLoginClick={() => setCurrentView('login')} />;
        case 'support':
            return <SupportForm onBackToHome={() => navigate('/')} />;
        default:
            return <LoginForm onViewChange={setCurrentView} />;
    }
  };
  
  const getTitle = () => {
      switch (currentView) {
          case 'signup':
              return "Criar Conta";
          case 'recover':
              return "Recuperar Senha";
          case 'new-password':
              return "Definir Nova Senha";
          case 'support':
              return "Suporte";
          case 'login':
          default:
              return "Acesso ZapCorretor";
      }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderForm()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;