import React from "react";
import { useQuery } from "@tanstack/react-query";
import { superadminService, ZapTenant, PlatformStats } from "@/services/zapCorretor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Building,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// --- Helper Components ---

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, className = "" }) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

interface TenantHighlightProps {
    tenant: ZapTenant;
}

const TenantHighlight: React.FC<TenantHighlightProps> = ({ tenant }) => {
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

    const expiresSoon = tenant.plan_expires_at && new Date(tenant.plan_expires_at).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000;

    return (
        <div className="flex justify-between items-center p-2 border-b last:border-b-0">
            <div className="flex flex-col">
                <span className="font-medium">{tenant.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {getStatusBadge(tenant.plan_status)}
                    {tenant.plan_expires_at && (
                        <span className={expiresSoon ? "text-destructive ml-2" : "ml-2"}>
                            Expira: {format(new Date(tenant.plan_expires_at), 'dd/MM/yyyy')}
                        </span>
                    )}
                </span>
            </div>
            <span className="text-sm font-bold text-right">
                {tenant.base_monthly_leads_limit.toLocaleString()} leads
            </span>
        </div>
    );
};


const SuperadminDashboardPage = () => {
  // Fetch platform-wide stats
  const { data: platformStats, isLoading: isLoadingPlatform, error: errorPlatform } = useQuery<PlatformStats, Error>({
    queryKey: ["platformStats"],
    queryFn: superadminService.getPlatformStats,
  });
    
  // Fetch all tenants (for list and expiration checks)
  const { data: tenants, isLoading: isLoadingTenants, error: errorTenants } = useQuery<ZapTenant[], Error>({
    queryKey: ["superadminTenantsList"],
    queryFn: superadminService.listTenants,
  });

  React.useEffect(() => {
    if (errorPlatform || errorTenants) {
      showError(`Erro ao carregar dados globais: ${errorPlatform?.message || errorTenants?.message}`);
    }
  }, [errorPlatform, errorTenants]);

  const isLoading = isLoadingPlatform || isLoadingTenants;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando dashboard global...</p>
      </div>
    );
  }

  const totalTenants = platformStats?.total_tenants || 0;
  const activeTenants = tenants?.filter(t => t.plan_status === 'active').length || 0;
  const expiringSoon = tenants?.filter(t => t.plan_expires_at && new Date(t.plan_expires_at).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000).length || 0;
  
  const totalAgents = platformStats?.total_agents || 0;
  const totalLeadsGenerated = platformStats?.total_leads || 0; 
  const totalSales = platformStats?.total_sales || 0;

  return (
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Dashboard Superadmin</h1>
        <p className="text-muted-foreground">Visão geral de todas as corretoras.</p>
      </header>

      {/* Linha de Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <MetricCard 
            title="Total de Corretoras" 
            value={totalTenants} 
            icon={<Building className="h-4 w-4 text-blue-500" />} 
        />
        <MetricCard 
            title="Corretoras Ativas" 
            value={activeTenants} 
            icon={<CheckCircle className="h-4 w-4 text-success" />} 
        />
        <MetricCard 
            title="Total de Corretores" 
            value={totalAgents.toLocaleString()}
            icon={<Users className="h-4 w-4 text-muted-foreground" />} 
        />
        <MetricCard 
            title="Leads Gerados (Total)" 
            value={totalLeadsGenerated.toLocaleString()} 
            icon={<TrendingUp className="h-4 w-4 text-primary" />} 
        />
        <MetricCard 
            title="Vendas Marcadas (Total)" 
            value={totalSales.toLocaleString()} 
            icon={<DollarSign className="h-4 w-4 text-green-600" />} 
        />
        <MetricCard 
            title="Planos Expirando (7 dias)" 
            value={expiringSoon} 
            icon={<Clock className="h-4 w-4 text-yellow-600" />} 
            className={expiringSoon > 0 ? "border-yellow-500" : ""}
        />
        <MetricCard 
            title="Corretoras Inadimplentes" 
            value="0" // Placeholder for future billing integration
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabela: Corretoras em Destaque (Top 5 por limite) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Corretoras (Top 5 por Limite)</CardTitle>
          </CardHeader>
          <CardContent>
            {tenants && tenants.length > 0 ? (
                tenants
                    .sort((a, b) => b.base_monthly_leads_limit - a.base_monthly_leads_limit)
                    .slice(0, 5)
                    .map(tenant => <TenantHighlight key={tenant.id} tenant={tenant} />)
            ) : (
                <p className="text-muted-foreground text-center py-4">Nenhuma corretora cadastrada.</p>
            )}
          </CardContent>
        </Card>

        {/* Alertas de Risco */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" /> Alertas de Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringSoon > 0 ? (
                tenants
                    ?.filter(t => t.plan_expires_at && new Date(t.plan_expires_at).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000)
                    .map(tenant => (
                        <div key={tenant.id} className="text-sm p-2 border-b last:border-b-0">
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Expira em: {format(new Date(tenant.plan_expires_at!), 'dd/MM/yyyy')}
                            </p>
                        </div>
                    ))
            ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum plano expirando em breve.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperadminDashboardPage;