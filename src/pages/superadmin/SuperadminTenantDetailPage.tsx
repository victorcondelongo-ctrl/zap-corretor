import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { superadminService, ZapTenant } from "@/services/zapCorretor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, Edit } from "lucide-react";
import { showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SecondaryButton } from "@/components/ui/CustomButton";

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'active':
            return <Badge variant="success">Ativo</Badge>;
        case 'trial':
            return <Badge variant="default">Teste</Badge>;
        case 'expired':
            return <Badge variant="destructive">Expirado</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

const SuperadminTenantDetailPage = () => {
  const { id: tenantId } = useParams<{ id: string }>();

  // Fetch all tenants and find the specific one (simplification)
  const { data: tenants, isLoading, error } = useQuery<ZapTenant[], Error>({
    queryKey: ["superadminTenantsList"],
    queryFn: superadminService.listTenants,
  });

  const tenant = tenants?.find(t => t.id === tenantId);

  React.useEffect(() => {
    if (error) {
      showError(`Erro ao carregar dados da corretora: ${error.message}`);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando detalhes da corretora...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2 text-brand">Corretora Não Encontrada</h1>
        <p className="text-muted-foreground">O ID da corretora {tenantId} não corresponde a nenhum registro.</p>
      </div>
    );
  }

  // Placeholder data for metrics
  const leadsThisMonth = 1200;
  const leadsLimit = tenant.base_monthly_leads_limit;
  const usagePercentage = leadsLimit > 0 ? Math.round((leadsThisMonth / leadsLimit) * 100) : 0;

  return (
    <div className="p-6 space-y-8">
      <header className="border-b pb-4">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3 text-brand">
                {tenant.name}
                {getStatusBadge(tenant.plan_status)}
            </h1>
            <SecondaryButton size="sm">
                <Edit className="w-4 h-4 mr-2" /> Editar Configurações
            </SecondaryButton>
        </div>
        <div className="mt-2 text-sm text-muted-foreground flex gap-4 flex-wrap">
            <span>ID: {tenant.id.substring(0, 8)}...</span>
            <span>Criado em: {format(new Date(tenant.created_at), 'dd/MM/yyyy')}</span>
            <span>Corretores: N/A</span>
        </div>
      </header>

      {/* Resumo / Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Resumo do Plano</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">Padrão</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Expiração</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {tenant.plan_expires_at ? format(new Date(tenant.plan_expires_at), 'dd/MM/yyyy') : 'N/A'}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Limite Leads/Mês</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{leadsLimit.toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Uso Atual</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{usagePercentage}%</div>
                </CardContent>
            </Card>
        </div>
      </section>

      <Separator />

      {/* Configuração de Plano e Limites (Edição Simplificada) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Configuração de Plano e Limites</h2>
        <Card>
            <CardContent className="pt-6">
                <p className="text-muted-foreground">Funcionalidade de edição de plano será implementada aqui.</p>
            </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default SuperadminTenantDetailPage;