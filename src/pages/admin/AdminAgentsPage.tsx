import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgentCreationModal from "@/components/admin/AgentCreationModal";
import { adminTenantService, ZapProfile } from "@/services/zapCorretor";
import { showError } from "@/utils/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AdminAgentsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agents, setAgents] = useState<ZapProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedAgents = await adminTenantService.listAgents();
      setAgents(fetchedAgents);
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar a lista de corretores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAgentCreated = () => {
    // Refresh the list after a new agent is created
    fetchAgents();
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Corretores</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Corretor
        </Button>
      </header>
      <p className="text-muted-foreground">Gerencie os corretores (AGENTs) da sua corretora, incluindo criação, ativação e desativação.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Lista de Corretores ({agents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email (ID)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado Em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && agents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum corretor ativo encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.full_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {/* Note: We don't have email in ZapProfile, only ID. Using ID for now. */}
                        {agent.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.is_active ? "success" : "destructive"}>
                        {agent.is_active ? "ATIVO" : "INATIVO"}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(agent.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {/* Placeholder for future actions like Edit/Deactivate */}
                      <Button variant="outline" size="sm" disabled>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Agent Creation Modal */}
      <AgentCreationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAgentCreated={handleAgentCreated}
      />
    </div>
  );
};

export default AdminAgentsPage;