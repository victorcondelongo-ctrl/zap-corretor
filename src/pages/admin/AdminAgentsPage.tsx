import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Loader2, Edit, Trash2, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgentCreationModal from "@/components/admin/AgentCreationModal";
import AgentEditModal from "@/components/admin/AgentEditModal";
import { adminTenantService, ZapProfile } from "@/services/zapCorretor";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminAgentsPage = () => {
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ZapProfile | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<ZapProfile | null>(null);
  const [agents, setAgents] = useState<ZapProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all agents, including inactive ones
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
  
  const handleAgentUpdated = (updatedAgent: ZapProfile) => {
      // Update the local list with the modified agent
      setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
      setEditingAgent(null);
  };
  
  const handleDeleteAgent = async () => {
      if (!agentToDelete) return;
      
      const agentName = agentToDelete.full_name;
      const toastId = showLoading(`Excluindo corretor(a) ${agentName}...`);
      
      try {
          await adminTenantService.deleteAgent(agentToDelete.id);
          
          showSuccess(`Corretor(a) ${agentName} excluído(a) com sucesso.`);
          setAgentToDelete(null);
          fetchAgents(); // Refresh list
      } catch (err) {
          console.error("Agent deletion error:", err);
          showError(err instanceof Error ? err.message : "Falha ao excluir o corretor.");
      } finally {
          dismissToast(toastId);
      }
  };
  
  const handleToggleActiveStatus = async (agent: ZapProfile) => {
      const newStatus = !agent.is_active;
      const toastId = showLoading(newStatus ? `Ativando ${agent.full_name}...` : `Pausando ${agent.full_name}...`);
      
      try {
          const updatedAgent = await adminTenantService.updateAgentProfile(agent.id, {
              is_active: newStatus,
          });
          
          showSuccess(`Status de ${agent.full_name} alterado para ${newStatus ? 'ATIVO' : 'PAUSADO'}.`);
          handleAgentUpdated(updatedAgent);
      } catch (err) {
          console.error("Toggle status error:", err);
          showError(err instanceof Error ? err.message : "Falha ao alterar o status.");
      } finally {
          dismissToast(toastId);
      }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Corretores</h1>
        <Button onClick={() => setIsCreationModalOpen(true)}>
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
                  <TableHead>Exportar Leads</TableHead>
                  <TableHead>Criado Em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && agents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum corretor encontrado.
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
                        {agent.is_active ? "ATIVO" : "PAUSADO"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={agent.can_export_leads ? "default" : "secondary"}>
                            <FileText className="w-3 h-3 mr-1" /> {agent.can_export_leads ? "ATIVO" : "INATIVO"}
                        </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(agent.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant={agent.is_active ? "destructive" : "success"} 
                        size="sm" 
                        onClick={() => handleToggleActiveStatus(agent)}
                        disabled={loading}
                      >
                        <Clock className="w-4 h-4 mr-1" /> {agent.is_active ? 'Pausar' : 'Ativar'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingAgent(agent)}>
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setAgentToDelete(agent)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Excluir
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
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        onAgentCreated={handleAgentCreated}
      />
      
      {/* Agent Edit Modal */}
      {editingAgent && (
        <AgentEditModal
          isOpen={!!editingAgent}
          onClose={() => setEditingAgent(null)}
          agent={editingAgent}
          onAgentUpdated={handleAgentUpdated}
        />
      )}
      
      {/* Agent Deletion Confirmation Dialog */}
      <AlertDialog open={!!agentToDelete} onOpenChange={() => setAgentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o corretor 
              <span className="font-bold text-primary"> {agentToDelete?.full_name} </span> 
              e removerá seu acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgent} className="bg-destructive hover:bg-destructive/90">
              Excluir Corretor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAgentsPage;