import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/contexts/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

const AgentProfilePage = () => {
  const { profile, user, loading, refreshProfile } = useSession();
  const [fullName, setFullName] = React.useState(profile?.full_name || "");
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      await refreshProfile(); // Update context state
      showSuccess("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Update profile error:", error);
      showError(error instanceof Error ? error.message : "Falha ao atualizar o perfil.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
        showError("Email não encontrado para recuperação de senha.");
        return;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login?reset=true`, // Redireciona para login após o reset
    });

    if (error) {
        showError("Falha ao enviar email de recuperação: " + error.message);
    } else {
        showSuccess("Email de recuperação de senha enviado! Verifique sua caixa de entrada.");
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Meu Perfil</h1>
      <p className="text-muted-foreground">Gerencie suas informações pessoais e credenciais de acesso.</p>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" /> Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || "N/A"}
                disabled
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Input
                id="role"
                value={profile.role}
                disabled
                className="bg-muted/50 capitalize"
              />
            </div>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Use esta opção para receber um link de redefinição de senha no seu email.
          </p>
          <Button variant="outline" onClick={handleChangePassword}>
            Trocar Senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentProfilePage;