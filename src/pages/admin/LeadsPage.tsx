import React, { useState, useEffect, useCallback } from "react";
import {
  ZapProfile,
  ZapLead,
  LeadStatus,
  ZapMessage,
  getCurrentProfile,
  adminTenantService,
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";

// Mapa de tradução para os status
const statusTranslations: Record<LeadStatus | 'all', string> = {
  'all': 'Todos os Status',
  'new': 'Novo',
  'in_progress': 'Em Atendimento',
  'qualified': 'Qualificado',
  'abandoned': 'Abandonado',
  'sold': 'Vendido',
};

// Helper component for status badge styling
const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "secondary";
  let text = statusTranslations[status] || status.replace('_', ' ');

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

// Helper component for Lead Details Sheet
interface LeadDetailsSheetProps {
  leadId: string | null;
  onClose: () => void;
}

const LeadDetailsSheet: React.FC<LeadDetailsSheetProps> = ({ leadId, onClose }) => {
  const [details, setDetails] = useState<{ lead: ZapLead; messages: ZapMessage[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminTenantService.getLeadWithMessages(leadId);
        setDetails(data);
      } catch (err) {
        console.error("Error fetching lead details:", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar detalhes do lead.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [leadId]);

  if (!leadId) return null;

  return (
    <Sheet open={!!leadId} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detalhes do Lead</SheetTitle>
          <SheetDescription>Informações e histórico de mensagens.</SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {loading && (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && <p className="text-red-500">{error}</p>}
          
          {details && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{details.lead.name || "Sem Nome"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Telefone:</strong> {details.lead.phone}</p>
                  <p><strong>Status:</strong> <StatusBadge status={details.lead.status} /></p>
                  <p><strong>Agente:</strong> {details.lead.agent_id || 'Não Atribuído'}</p>
                  {details.lead.cpf && <p><strong>CPF:</strong> {details.lead.cpf}</p>}
                  {details.lead.cep && <p><strong>CEP:</strong> {details.lead.cep}</p>}
                  {details.lead.plate && <p><strong>Placa:</strong> {details.lead.plate}</p>}
                  <p><strong>Criado em:</strong> {format(new Date(details.lead.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </CardContent>
              </Card>

              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Últimas Mensagens ({details.messages.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto p-2 border rounded-md">
                {/* Displaying the last 3 messages, reversed (most recent first) */}
                {details.messages.slice(-3).reverse().map((msg) => (
                  <div key={msg.id} className="p-2 rounded-lg bg-muted/50 text-xs">
                    <p className="font-medium capitalize">
                      {msg.sender_type} ({format(new Date(msg.created_at), 'HH:mm')})
                    </p>
                    <p className="mt-1">{msg.body}</p>
                  </div>
                ))}
                {details.messages.length === 0 && <p className="text-gray-500">Nenhuma mensagem registrada.</p>}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};


const LeadsPage = () => {
  const [profile, setProfile] = useState<ZapProfile | null>(null);
  const [leads, setLeads] = useState<ZapLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [currentPhoneInput, setCurrentPhoneInput] = useState('');

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // --- Initialization and Role Check ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const p = await getCurrentProfile();
        if (p.role !== "ADMIN_TENANT") {
          setError("Acesso negado. Você não é um Administrador de Corretora.");
          setLoading(false);
          return;
        }
        setProfile(p);
      } catch (err) {
        console.error(err);
        setError("Erro de autenticação ou perfil não encontrado.");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // --- Data Fetching ---
  const fetchLeads = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    setError(null);
    try {
      const params = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        phone: phoneSearch || undefined,
      };
      
      const fetchedLeads = await adminTenantService.listLeads(params);
      setLeads(fetchedLeads);
    } catch (err) {
      console.error("Error fetching leads:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar a lista de leads.");
    } finally {
      setLoading(false);
    }
  }, [profile, statusFilter, phoneSearch]);

  useEffect(() => {
    if (profile) {
      fetchLeads();
    }
  }, [profile, fetchLeads]);

  // --- Handlers ---

  const handleSearch = () => {
    setPhoneSearch(currentPhoneInput);
  };

  const handleMarkAsSold = async (leadId: string) => {
    const toastId = showLoading("Marcando lead como vendido...");
    try {
      const updatedLead = await adminTenantService.markLeadAsSold(leadId);
      
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando...</p>
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

  if (!profile) {
    return null; // Should be covered by loading/error state
  }

  const leadStatuses: (LeadStatus | 'all')[] = ['all', 'new', 'in_progress', 'qualified', 'abandoned', 'sold'];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Gestão de Leads da Corretora</h1>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {leadStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {statusTranslations[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 flex-grow">
            <Input
              placeholder="Buscar por telefone (ex: 55119...)"
              value={currentPhoneInput}
              onChange={(e) => setCurrentPhoneInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" /> Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Encontrados ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Criado Em</TableHead>
                  <TableHead>Última Interação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                    <TableCell>{lead.agent_id || 'Não Atribuído'}</TableCell>
                    <TableCell>{format(new Date(lead.created_at), 'dd/MM/yy')}</TableCell>
                    <TableCell>
                      {lead.last_interaction_at ? format(new Date(lead.last_interaction_at), 'dd/MM/yy HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedLeadId(lead.id)}>
                        Detalhes
                      </Button>
                      {lead.status !== 'sold' && (
                        <Button 
                          variant="success" 
                          size="sm" 
                          onClick={() => handleMarkAsSold(lead.id)}
                          disabled={loading}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Vender
                        </Button>
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
      />
    </div>
  );
};

export default LeadsPage;