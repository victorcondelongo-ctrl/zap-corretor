import React, { useState, useEffect, useCallback } from "react";
import {
  ZapProfile,
  ZapDashboardStats,
  ZapSalesByAgent,
  getCurrentProfile,
  adminTenantService,
} from "@/services/zapCorretor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  XCircle,
  Users,
  TrendingUp,
  Target,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

// --- Helper Components ---

interface MetricCardProps {
  title: string;
  value: number;
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
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </CardContent>
  </Card>
);

interface FunnelItemProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

const FunnelItem: React.FC<FunnelItemProps> = ({ label, count, total, color }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label} ({count})</span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface SalesByAgentProps {
  salesData: ZapSalesByAgent[];
}

const SalesByAgentList: React.FC<SalesByAgentProps> = ({ salesData }) => {
  if (salesData.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhuma venda registrada ainda.</p>;
  }

  const maxSales = Math.max(...salesData.map(d => d.sales_count));

  return (
    <div className="space-y-4">
      {salesData.map((item) => {
        const width = maxSales > 0 ? (item.sales_count / maxSales) * 100 : 0;
        return (
          <div key={item.agent_id} className="flex items-center gap-4">
            <div className="w-1/3 text-sm font-medium truncate" title={item.agent_id}>
              Agente ID: {item.agent_id.substring(0, 8)}...
            </div>
            <div className="w-2/3 flex items-center gap-2">
              <div className="flex-grow h-3 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-sm font-bold w-10 text-right">{item.sales_count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Page Component ---

const AdminDashboardPage = () => {
  const { profile } = useSession();
  const [stats, setStats] = useState<ZapDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const tenantName = profile?.tenant_name || "Corretora";

  const loadStats = useCallback(async (p: ZapProfile) => {
    if (p.role !== "ADMIN_TENANT") {
      setError("Acesso negado. Você não é um Administrador de Corretora.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dashboardStats = await adminTenantService.getDashboardStats();
      setStats(dashboardStats);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar as estatísticas do dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
        loadStats(profile);
    } else if (!profile && !loading) {
        // If profile is null after loading, handle error
        setError("Erro de autenticação ou perfil não encontrado.");
    }
  }, [profile, loadStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Erro de Acesso</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Dashboard da {tenantName}</h1>
        <p className="text-muted-foreground">Nenhum dado disponível para exibição.</p>
      </div>
    );
  }

  const totalLeads = stats.total_leads;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard da {tenantName}</h1>

      {/* Linha de Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        <MetricCard title="Total de Leads" value={stats.total_leads} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Novos" value={stats.leads_new} icon={<Zap className="h-4 w-4 text-blue-500" />} />
        <MetricCard title="Em Atendimento" value={stats.leads_in_progress} icon={<Clock className="h-4 w-4 text-yellow-500" />} />
        <MetricCard title="Qualificados" value={stats.leads_qualified} icon={<Target className="h-4 w-4 text-green-500" />} />
        <MetricCard title="Abandonados" value={stats.leads_abandoned} icon={<XCircle className="h-4 w-4 text-destructive" />} />
        <MetricCard title="Vendidos (Leads)" value={stats.leads_sold} icon={<CheckCircle className="h-4 w-4 text-success" />} />
        <MetricCard title="Total de Vendas" value={stats.total_sales} icon={<DollarSign className="h-4 w-4 text-primary" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Funil de Leads */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Funil de Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalLeads === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum lead registrado ainda para formar o funil.</p>
            ) : (
              <>
                <FunnelItem
                  label="Novos"
                  count={stats.leads_new}
                  total={totalLeads}
                  color="bg-blue-500"
                />
                <FunnelItem
                  label="Em Atendimento"
                  count={stats.leads_in_progress}
                  total={totalLeads}
                  color="bg-yellow-500"
                />
                <FunnelItem
                  label="Qualificados"
                  count={stats.leads_qualified}
                  total={totalLeads}
                  color="bg-green-500"
                />
                <FunnelItem
                  label="Abandonados"
                  count={stats.leads_abandoned}
                  total={totalLeads}
                  color="bg-destructive"
                />
                <Separator className="my-4" />
                <FunnelItem
                  label="Vendidos"
                  count={stats.leads_sold}
                  total={totalLeads}
                  color="bg-success"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Vendas por Agente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Vendas por Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesByAgentList salesData={stats.sales_by_agent} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;