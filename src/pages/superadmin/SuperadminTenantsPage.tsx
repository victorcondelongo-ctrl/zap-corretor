import React from "react";
import { useQuery } from "@tanstack/react-query";
import { superadminService, ZapTenant } from "@/services/zapCorretor";
import { showError } from "@/utils/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Eye } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

// Helper component for status badge styling
const PlanStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "secondary";
  let text = status.toUpperCase();

  switch (status) {
    case 'active':
      variant = 'success';
      text = 'ATIVO';
      break;
    case 'trial':
      variant = 'default';
      text = 'TESTE';
      break;
    case 'expired':
      variant = 'destructive';
      text = 'EXPIRADO';
      break;
    default:
      variant = 'secondary';
  }

  return <Badge variant={variant} className="capitalize">{text}</Badge>;
};


const SuperadminTenantsPage = () => {
  // Fetch all tenants
  const { data: tenants, isLoading, error } = useQuery<ZapTenant[], Error>({
    queryKey: ["superadminTenantsList"],
    queryFn: superadminService.listTenants,
  });

  React.useEffect(() => {
    if (error) {
      showError(`Erro ao carregar a lista de corretoras: ${error.message}`);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando corretoras...</p>
      </div>
    );
  }

  // Placeholder for creation logic (future modal/form)
  const handleCreateTenant = () => {
    // This action will be implemented later
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Corretoras</h1>
        <Button onClick={handleCreateTenant}>
          <Plus className="w-4 h-4 mr-2" /> Nova Corretora
        </Button>
      </header>

      {/* Filters (Simplified for MVP) */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros (Em Breve)</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Filtros de busca e status serão adicionados aqui.</p>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Corretoras Cadastradas ({tenants?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status Plano</TableHead>
                  <TableHead>Expiração</TableHead>
                  <TableHead>Limite Leads/Mês</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants && tenants.length > 0 ? (
                  tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tenant.id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <PlanStatusBadge status={tenant.plan_status} />
                      </TableCell>
                      <TableCell>
                        {tenant.plan_expires_at ? format(new Date(tenant.plan_expires_at), 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>{tenant.base_monthly_leads_limit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/superadmin/tenants/${tenant.id}`}>
                            <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" /> Ver detalhes
                            </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhuma corretora encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminTenantsPage;