import React, { useState, useEffect, useCallback } from "react";
import {
  ZapLead,
  LeadStatus,
  ZapMessage,
  agentService,
} from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, XCircle, MessageSquare, CheckCircle, FileText, Edit } from "lucide-react";
import { format } from "date-fns";
import LeadConversation from "@/components/agent/LeadConversation";
import LeadEditForm from "@/components/agent/LeadEditForm";
import { Separator } from "@/components/ui/separator";
import { PrimaryButton, SecondaryButton } from "@/components/ui/CustomButton";

// Helper component for status badge styling
const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "secondary";
  let text = status.replace('_', ' ');

  switch (status) {
    case 'new':
      variant = 'default';
      break;
    case 'in_progress':
      variant = 'warning';
      break;
    case 'qualified':
      variant = 'success';
      break;
    case 'sold':
      variant = 'success';
      text = 'VENDIDO';
      break;
    case 'abandoned':
      variant = 'destructive';
      break;
    default:
      variant = 'secondary';
  }

  return <Badge variant={variant} className="capitalize">{text}</Badge>;
};

// Helper component for Lead Details Sheet (adapted for AgentService)
interface LeadDetailsSheetProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated: (updatedLead: ZapLead) => void;
}

const LeadDetailsSheet: React.FC<LeadDetailsSheetProps> = ({ leadId, onClose, onLeadUpdated }) => {
  const [details, setDetails] = useState<{ lead: ZapLead; messages: ZapMessage[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentService.getLeadWithMessages(id);
      setDetails(data);
    } catch (err) {
      console.error("Error fetching lead details:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar detalhes do lead.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (leadId) {
      fetchDetails(leadId);
    } else {
      setDetails(null);
    }
  }, [leadId, fetchDetails]);
  
  const handleLocalUpdate = (updatedLead: ZapLead) => {
      setDetails(prev => prev ? { ...prev, lead: updatedLead } : null);
      onLeadUpdated(updatedLead);
      setIsEditing(false);
  };

  if (!leadId) return null;

  return (
    <Sheet open={!!leadId} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-full">
        <SheetHeader>
          <SheetTitle>Detalhes do Seu Lead</SheetTitle>
          <SheetDescription>Informações e histórico de mensagens.</SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4 h-[calc(100vh-100px)] overflow-y-auto">
          {loading && (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && <p className="text-red-500">{error}</p>}
          
          {details && (
            <>
              {/* Lead Data Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{details.lead.name || "Sem Nome"}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="rounded-xl transition-all duration-200">
                    <Edit className="w-4 h-4 mr-2" /> {isEditing ? 'Cancelar' : 'Editar Dados'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {isEditing ? (
                    <LeadEditForm lead={details.lead} onLeadUpdated={handleLocalUpdate} />
                  ) : (
                    <>
                      <p><strong>Telefone:</strong> {details.lead.phone}</p>
                      <p><strong>Status:</strong> <StatusBadge status={details.lead.status} /></p>
                      {details.lead.cpf && <p><strong>CPF:</strong> {details.lead.cpf}</p>}
                      {details.lead.cep && <p><strong>CEP:</strong> {details.lead.cep}</p>}
                      {details.lead.plate && <p><strong>Placa:</strong> {details.lead.plate}</p>}
                      <p><strong>Criado em:</strong> {format(new Date(details.lead.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Separator />

              {/* Conversation History */}
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Histórico Completo de Conversa
              </h3>
              <LeadConversation messages={details.messages} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};


const MyLeadsPage = () => {
  const [leads, setLeads] = useState<ZapLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: statusFilter === 'all' ? undefined : statusFilter,
      };
      
      const fetchedLeads = await agentService.listMyLeads(params);
      setLeads(fetchedLeads);
    } catch (err) {
      console.error("Error fetching leads:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar a lista de leads.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // --- Handlers ---

  const handleMarkAsSold = async (leadId: string) => {
    const toastId = showLoading("Marcando lead como vendido...");
    try {
      const updatedLead = await agentService.markLeadAsSold(leadId);
      
      // Update local state
      setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      
      showSuccess("Lead marcado como vendido com sucesso!");
    } catch (err) {
      console.error("Error marking lead as sold:", err);
      showError(err instanceof Error ? err.message : "Falha ao marcar lead como vendido.");
    } finally {
      dismissToast(toastId);
    }
  };
  
  const handleLeadUpdated = (updatedLead: ZapLead) => {
      // Update the lead list after editing
      setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };
  
  const handleExportLeads = async () => {
      // NOTE: Permission check (7.3) is handled by the Admin panel configuration 
      // and should ideally be checked here via a profile flag. 
      // Assuming for now the agent has permission to export their own leads.
      const toastId = showLoading("Preparando exportação...");
      try {
          // Placeholder for actual export logic
          await agentService.exportMyLeads(statusFilter === 'all' ? undefined : statusFilter);
          showSuccess("Exportação iniciada! Seu arquivo será gerado em breve.");
      } catch (err) {
          showError(err instanceof Error ? err.message : "Falha ao iniciar a exportação.");
      } finally {
          dismissToast(toastId);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando seus leads...</p>
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

  const leadStatuses: (LeadStatus | 'all')[] = ['all', 'new', 'in_progress', 'qualified', 'abandoned', 'sold'];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-brand">Meus Leads</h1>

      {/* Filters and Export */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Ações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus | 'all')}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {leadStatuses.map(status => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status === 'all' ? 'Todos os Status' : status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <SecondaryButton onClick={handleExportLeads} disabled={loading || leads.length === 0}>
            <FileText className="w-4 h-4 mr-2" /> Exportar Leads ({leads.length})
          </SecondaryButton>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Atribuídos a Você ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado Em</TableHead>
                  <TableHead>Última Interação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum lead encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                )}
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.phone}</TableCell>
                    <TableCell>{lead.name || 'N/A'}</TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>{format(new Date(lead.created_at), 'dd/MM/yy')}</TableCell>
                    <TableCell>
                      {lead.last_interaction_at ? format(new Date(lead.last_interaction_at), 'dd/MM/yy HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedLeadId(lead.id)} className="rounded-xl transition-all duration-200">
                        Detalhes
                      </Button>
                      {lead.status !== 'sold' && (
                        <PrimaryButton 
                          size="sm" 
                          onClick={() => handleMarkAsSold(lead.id)}
                          disabled={loading}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Vender
                        </PrimaryButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Details Sheet */}
      <LeadDetailsSheet 
        leadId={selectedLeadId} 
        onClose={() => setSelectedLeadId(null)} 
        onLeadUpdated={handleLeadUpdated}
      />
    </div>
  );
};

export default MyLeadsPage;