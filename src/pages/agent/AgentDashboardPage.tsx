import React, { useState, useEffect, useCallback } from "react";
import { agentService, ZapLead, LeadStatus } from "@/services/zapCorretor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Target, CheckCircle, Clock, XCircle, DollarSign } from "lucide-react";
import { showError } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";
import WhatsAppConnectionCard from "@/components/agent/WhatsAppConnectionCard"; // Import new component

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

// --- Main Page Component ---

const AgentDashboardPage = () => {
  const [leads, setLeads] = useState<ZapLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all leads for the agent (status: undefined)
      const fetchedLeads = await agentService.listMyLeads({});
      setLeads(fetchedLeads);
    } catch (err) {
      console.error("Error fetching dashboard leads:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando seu dashboard...</p>
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

  const totalLeads = leads.length;
  const counts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);
  
  const totalSales = counts.sold || 0;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Meu Dashboard</h1>
      <p className="text-muted-foreground">Visão geral dos seus leads e performance.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* WhatsApp Connection Card (New) */}
        <div className="lg:col-span-1">
            <WhatsAppConnectionCard />
        </div>
        
        {/* Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard title="Total de Leads" value={totalLeads} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
            <MetricCard title="Qualificados" value={counts.qualified || 0} icon={<Target className="h-4 w-4 text-green-500" />} />
            <MetricCard title="Vendas no Mês" value={totalSales} icon={<DollarSign className="h-4 w-4 text-primary" />} />
            <MetricCard title="Em Atendimento" value={counts.in_progress || 0} icon={<Clock className="h-4 w-4 text-yellow-500" />} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Funil de Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalLeads === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum lead atribuído ainda.</p>
            ) : (
              <>
                <FunnelItem
                  label="Novo"
                  count={counts.new || 0}
                  total={totalLeads}
                  color="bg-blue-500"
                />
                <FunnelItem
                  label="Em Atendimento"
                  count={counts.in_progress || 0}
                  total={totalLeads}
                  color="bg-yellow-500"
                />
                <FunnelItem
                  label="Qualificado"
                  count={counts.qualified || 0}
                  total={totalLeads}
                  color="bg-green-500"
                />
                <FunnelItem
                  label="Abandonado"
                  count={counts.abandoned || 0}
                  total={totalLeads}
                  color="bg-destructive"
                />
                <Separator className="my-4" />
                <FunnelItem
                  label="Vendido"
                  count={counts.sold || 0}
                  total={totalLeads}
                  color="bg-success"
                />
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Placeholder for Sales History / Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Leads mais recentes ou últimas vendas serão exibidas aqui.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboardPage;