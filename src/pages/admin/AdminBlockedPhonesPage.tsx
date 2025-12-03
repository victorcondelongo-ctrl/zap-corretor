import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldOff, Upload, Trash2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import BlockPhoneForm from "@/components/admin/BlockPhoneForm";

interface BlockedPhone {
    id: string;
    phone: string;
    imported_at: string;
    // We don't need imported_by_profile_id or tenant_id here, RLS handles it
}

const AdminBlockedPhonesPage = () => {
  const { profile } = useSession();
  const [blockedPhones, setBlockedPhones] = useState<BlockedPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const tenantName = profile?.tenant_name || "Corretora";

  const fetchBlockedPhones = useCallback(async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    setError(null);
    try {
      // RLS ensures only phones for the current tenant are returned
      const { data, error } = await supabase
        .from('blocked_phones')
        .select('id, phone, imported_at')
        .order('imported_at', { ascending: false });

      if (error) {
        throw error;
      }
      setBlockedPhones(data as BlockedPhone[]);
    } catch (err) {
      console.error("Error fetching blocked phones:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar a lista de telefones bloqueados.");
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (profile?.tenant_id) {
        fetchBlockedPhones();
    }
  }, [profile?.tenant_id, fetchBlockedPhones]);
  
  const handlePhoneBlocked = () => {
      fetchBlockedPhones();
  };
  
  const handleUnblockPhone = async (id: string, phone: string) => {
      const toastId = showLoading(`Desbloqueando ${phone}...`);
      try {
          const { error } = await supabase
            .from('blocked_phones')
            .delete()
            .eq('id', id);
            
          if (error) {
              throw error;
          }
          
          showSuccess(`Telefone ${phone} desbloqueado com sucesso.`);
          fetchBlockedPhones();
      } catch (err) {
          showError(err instanceof Error ? err.message : "Falha ao desbloquear o telefone.");
      } finally {
          dismissToast(toastId);
      }
  };
  
  const handleImportCSV = () => {
      showError("Funcionalidade de Importação CSV ainda não implementada.");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando lista de bloqueio...</p>
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Telefones Bloqueados da {tenantName}</h1>
      <p className="text-muted-foreground">Gerencie a lista de telefones que a IA não deve responder (pausar a IA para quem já é cliente).</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5" /> Bloquear Telefone Individualmente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BlockPhoneForm onPhoneBlocked={handlePhoneBlocked} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Importar Lista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Importe uma lista de telefones (CSV) para bloqueio em massa.</p>
          <Button variant="secondary" onClick={handleImportCSV}>
            <Upload className="w-4 h-4 mr-2" /> Fazer Upload CSV (Em Breve)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Lista Atual ({blockedPhones.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Bloqueado Em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedPhones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nenhum telefone bloqueado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  blockedPhones.map((phone) => (
                    <TableRow key={phone.id}>
                      <TableCell className="font-medium">{phone.phone}</TableCell>
                      <TableCell>{format(new Date(phone.imported_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleUnblockPhone(phone.id, phone.phone)}
                        >
                          Desbloquear
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBlockedPhonesPage;