import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superadminService, ZapSupportTicket, SupportTicketStatus } from "@/services/zapCorretor";
import { showError, showSuccess } from "@/utils/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LifeBuoy, MessageSquare, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusTranslations: Record<SupportTicketStatus, string> = {
    'new': 'Novo',
    'in_progress': 'Em Progresso',
    'closed': 'Fechado',
};

const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
        case 'new':
            return <Badge variant="default" className="bg-brand hover:bg-brand/90">Novo</Badge>;
        case 'in_progress':
            return <Badge variant="warning">Em Progresso</Badge>;
        case 'closed':
            return <Badge variant="success">Fechado</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

interface TicketDetailsModalProps {
    ticket: ZapSupportTicket | null;
    onClose: () => void;
    onStatusChange: (id: string, status: SupportTicketStatus) => void;
}

const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({ ticket, onClose, onStatusChange }) => {
    if (!ticket) return null;

    const [currentStatus, setCurrentStatus] = useState<SupportTicketStatus>(ticket.status);
    
    const handleStatusUpdate = (newStatus: SupportTicketStatus) => {
        setCurrentStatus(newStatus);
        onStatusChange(ticket.id, newStatus);
    };

    return (
        <Dialog open={!!ticket} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Ticket #{ticket.id.substring(0, 8)}...
                    </DialogTitle>
                    <DialogDescription>
                        Detalhes do chamado de suporte.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-medium">Nome:</p>
                            <p className="text-muted-foreground">{ticket.name}</p>
                        </div>
                        <div>
                            <p className="font-medium">E-mail:</p>
                            <p className="text-muted-foreground">{ticket.email}</p>
                        </div>
                        <div>
                            <p className="font-medium">Telefone:</p>
                            <p className="text-muted-foreground">{ticket.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="font-medium">Criado em:</p>
                            <p className="text-muted-foreground">{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="font-medium">Mensagem:</p>
                        <ScrollArea className="h-32 p-4 border rounded-md bg-muted/50">
                            <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                        </ScrollArea>
                    </div>

                    <div className="space-y-2 pt-4">
                        <p className="font-medium">Status:</p>
                        <Select value={currentStatus} onValueChange={(val) => handleStatusUpdate(val as SupportTicketStatus)}>
                            <SelectTrigger className="w-[200px] rounded-xl">
                                <SelectValue placeholder="Mudar Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(statusTranslations).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};


const SuperadminSupportPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('new');
  const [selectedTicket, setSelectedTicket] = useState<ZapSupportTicket | null>(null);

  const { data: tickets, isLoading, error } = useQuery<ZapSupportTicket[], Error>({
    queryKey: ["supportTickets", statusFilter],
    queryFn: () => superadminService.listSupportTickets(statusFilter),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: SupportTicketStatus }) => 
        superadminService.updateSupportTicketStatus(id, status),
    onSuccess: (updatedTicket) => {
      showSuccess(`Status do ticket ${updatedTicket.id.substring(0, 8)}... atualizado para ${statusTranslations[updatedTicket.status]}.`);
      // Update local state if modal is open
      setSelectedTicket(prev => prev ? updatedTicket : null);
      // Refetch the list to update the table
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    },
    onError: (err) => {
      showError(`Falha ao atualizar status: ${err.message}`);
    },
  });
  
  const handleStatusChange = (id: string, status: SupportTicketStatus) => {
      updateStatusMutation.mutate({ id, status });
  };

  useEffect(() => {
    if (error) {
      showError(`Erro ao carregar tickets: ${error.message}`);
    }
  }, [error]);

  const ticketStatuses: (SupportTicketStatus | 'all')[] = ['new', 'in_progress', 'closed', 'all'];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2 text-brand">
        <LifeBuoy className="w-7 h-7" /> Gestão de Suporte
      </h1>
      <p className="text-muted-foreground">Visualize e gerencie os tickets de suporte enviados por usuários anônimos e logados.</p>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SupportTicketStatus | 'all')}>
                <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Filtrar por Status" />
                </SelectTrigger>
                <SelectContent>
                    {ticketStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                            {statusTranslations[status as SupportTicketStatus] || 'Todos'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets ({tickets?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado Em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && tickets && tickets.length > 0 ? (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="text-xs text-muted-foreground">{ticket.id.substring(0, 8)}...</TableCell>
                      <TableCell className="font-medium">{ticket.name}</TableCell>
                      <TableCell>{ticket.email}</TableCell>
                      <TableCell>
                        {getStatusBadge(ticket.status)}
                      </TableCell>
                      <TableCell>{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)} className="rounded-xl transition-all duration-200">
                            <MessageSquare className="w-4 h-4 mr-1" /> Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum ticket encontrado com o filtro atual.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <TicketDetailsModal 
        ticket={selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default SuperadminSupportPage;