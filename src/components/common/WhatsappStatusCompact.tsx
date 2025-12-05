import React, { useState, useMemo } from "react";
import { useUazapiInstanceStatus } from "@/hooks/use-uazapi-status";
import { useUazapiInstanceActions } from "@/hooks/use-uazapi-actions";
import { Loader2, Zap, CheckCircle, XCircle, QrCode, Clock, RefreshCw, Phone, Power, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PrimaryButton, DestructiveButton, SecondaryButton } from "@/components/ui/CustomButton";
import { useSession } from "@/contexts/SessionContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { agentService } from "@/services/zapCorretor";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface WhatsappStatusCompactProps {
  isAgentAutonomous: boolean; // True for independent agents (AGENT with tenant_id = null)
  onManageClick: () => void; // Callback to navigate to the full settings page
}

const WhatsappStatusCompact: React.FC<WhatsappStatusCompactProps> = ({ isAgentAutonomous, onManageClick }) => {
  const { profile, refreshProfile } = useSession();
  const navigate = useNavigate();

  // --- Lógica para Agentes Autônomos e Admin (com Uazapi) ---
  const { statusData, isLoadingStatus, errorStatus, refetchStatus } = useUazapiInstanceStatus();
  const { 
    isCreating, 
    isConnecting, 
    isDisconnecting, 
    createInstance, 
    connectInstance, 
    disconnectInstance 
  } = useUazapiInstanceActions(refetchStatus);
  
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairCodeData, setPairCodeData] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectMethod, setConnectMethod] = useState<'qr' | 'pair' | null>(null);
  const [pairCodePhone, setPairCodePhone] = useState('');

  const isActionLoading = isCreating || isConnecting || isDisconnecting;

  const handleConnect = async () => {
    setQrCodeData(null);
    setPairCodeData(null);
    setIsConnectModalOpen(true); // Open modal to choose connection method
  };

  const handleConnectWithMethod = async (method: 'qr' | 'pair') => {
    setConnectMethod(method);
    setIsConnectModalOpen(false); // Close method selection modal

    // A conexão real será feita em handleConnectWithPairCodePhone se for 'pair'
    if (method === 'pair') {
        // Abre o modal de input de telefone
        return; 
    }
    
    // Se for QR Code, chama connectInstance sem phone
    const response = await connectInstance(); 
    
    if (response?.qrcode_base64) {
      setQrCodeData(response.qrcode_base64);
    } else {
      showError("Falha ao obter QR Code. Tente novamente.");
    }
  };

  const handleConnectWithPairCodePhone = async () => {
    if (!pairCodePhone) {
      showError("Por favor, insira o número de telefone para o Pair Code.");
      return;
    }
    setPairCodeData(null); // Clear previous pair code
    const response = await connectInstance(pairCodePhone); // Passando o phone!
    
    if (response?.pairingCode) {
      setPairCodeData(response.pairingCode);
      setConnectMethod(null); // Close the pair code input modal
    } else {
      showError("Falha ao obter Pair Code. Tente novamente.");
    }
  };
  
  const handleDisconnect = async () => {
    await disconnectInstance();
    setQrCodeData(null);
    setPairCodeData(null);
  };

  const statusInfo = useMemo(() => {
    const status = statusData?.status || 'unknown';
    
    switch (status) {
      case 'connected':
        return { text: "Conectado", variant: "success", icon: CheckCircle, tooltip: "WhatsApp conectado e ativo." };
      case 'disconnected':
        return { text: "Desconectado", variant: "destructive", icon: XCircle, tooltip: "WhatsApp desconectado. Requer reconexão." };
      case 'waiting_qr':
      case 'waiting_pair':
        return { text: "Aguardando Conexão", variant: "warning", icon: QrCode, tooltip: "Aguardando leitura do QR Code ou Pair Code." };
      case 'created':
        return { text: "Instância Criada", variant: "default", icon: Zap, tooltip: "Instância Uazapi criada, mas não conectada ao WhatsApp." };
      case 'no_instance':
        return { text: "Sem Instância", variant: "secondary", icon: Zap, tooltip: "Nenhuma instância Uazapi criada para este perfil." };
      case 'error':
        return { text: "Erro", variant: "destructive", icon: XCircle, tooltip: "Ocorreu um erro na instância do WhatsApp." };
      default:
        return { text: "Status Desconhecido", variant: "secondary", icon: Clock, tooltip: "Verificando status do WhatsApp." };
    }
  }, [statusData]);
  
  const Icon = statusInfo.icon;
  const statusVariant = statusInfo.variant as "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

  // --- Lógica para Agentes Vinculados (sem Uazapi própria, apenas alertas) ---
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(profile?.schedule_enabled ?? false);
  const [isUpdatingAlerts, setIsUpdatingAlerts] = useState(false);
  const [whatsappAlertNumber, setWhatsappAlertNumber] = useState(profile?.whatsapp_alert_number || "");

  // Update local state when profile changes
  React.useEffect(() => {
    setIsAlertsEnabled(profile?.schedule_enabled ?? false);
    setWhatsappAlertNumber(profile?.whatsapp_alert_number || "");
  }, [profile]);

  const handleToggleAlerts = async (checked: boolean) => {
    if (!profile) return;
    setIsUpdatingAlerts(true);
    const toastId = showLoading(checked ? "Ativando alertas..." : "Pausando alertas...");
    try {
      await agentService.saveSettings({ schedule_enabled: checked });
      setIsAlertsEnabled(checked);
      showSuccess(checked ? "Alertas ativados!" : "Alertas pausados.");
      await refreshProfile(); // Refresh profile to update context
    } catch (error) {
      console.error("Error toggling alerts:", error);
      showError(error instanceof Error ? error.message : "Falha ao alterar status dos alertas.");
    } finally {
      dismissToast(toastId);
      setIsUpdatingAlerts(false);
    }
  };

  // --- Renderização Condicional ---

  // Caso 1: Agente vinculado a uma corretora (tenant_id não nulo)
  if (!isAgentAutonomous && profile?.tenant_id !== null && profile?.role === 'AGENT') {
    return (
      <div className="p-3 border rounded-xl shadow-sm bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-md" onClick={onManageClick}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand" /> Alertas de WhatsApp
          </h3>
          <Badge variant={isAlertsEnabled ? "success" : "destructive"}>
            {isAlertsEnabled ? "ATIVO" : "PAUSADO"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Número: {whatsappAlertNumber || "Não configurado"}
        </p>
        <div className="flex items-center justify-between">
          <Label htmlFor="alerts-toggle" className="text-xs">Receber Alertas</Label>
          <Switch
            id="alerts-toggle"
            checked={isAlertsEnabled}
            onCheckedChange={handleToggleAlerts}
            disabled={isUpdatingAlerts}
            onClick={(e) => e.stopPropagation()} // Prevent triggering onManageClick
          />
        </div>
      </div>
    );
  }

  // Caso 2: Admin da Corretora ou Agente Autônomo (com Uazapi)
  const title = isAgentAutonomous ? "Meu WhatsApp" : "WhatsApp Central";
  const currentNumber = profile?.whatsapp_alert_number || profile?.instance_id ? "ID: " + profile.instance_id?.substring(0, 8) + "..." : "N/A";

  return (
    <div className="p-3 border rounded-xl shadow-sm bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-md" onClick={onManageClick}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand" /> {title}
        </h3>
        <Badge variant={statusVariant}>
          {statusInfo.text}
        </Badge>
      </div>
      
      {isLoadingStatus ? (
        <div className="flex items-center text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin mr-1" /> Carregando...
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            {profile?.whatsapp_alert_number ? `Número: ${profile.whatsapp_alert_number}` : `Instância: ${currentNumber}`}
          </p>
          {qrCodeData && (
            <div className="text-center my-2">
              <img 
                src={`data:image/png;base64,${qrCodeData}`} 
                alt="QR Code" 
                className="mx-auto w-24 h-24 object-contain"
              />
              <p className="text-xs text-muted-foreground mt-1">Escaneie o QR Code</p>
            </div>
          )}
          {pairCodeData && (
            <div className="text-center my-2">
              <p className="text-lg font-bold text-brand tracking-widest">{pairCodeData}</p>
              <p className="text-xs text-muted-foreground mt-1">Use o Pair Code</p>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-3">
            {statusData?.status === 'no_instance' && (
              <PrimaryButton size="sm" onClick={(e) => { e.stopPropagation(); createInstance(); }} disabled={isActionLoading}>
                {isCreating ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Criar Instância"}
              </PrimaryButton>
            )}
            
            {(statusData?.status === 'disconnected' || statusData?.status === 'created') && statusData.hasInstance && (
              <PrimaryButton size="sm" onClick={(e) => { e.stopPropagation(); handleConnect(); }} disabled={isActionLoading}>
                {isConnecting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Conectar WhatsApp"}
              </PrimaryButton>
            )}

            {(statusData?.status === 'waiting_qr' || statusData?.status === 'waiting_pair') && statusData.hasInstance && (
              <PrimaryButton size="sm" onClick={(e) => { e.stopPropagation(); handleConnect(); }} disabled={isActionLoading}>
                {isConnecting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Mostrar QR / Pair Code"}
              </PrimaryButton>
            )}
            
            {statusData?.status === 'connected' && (
              <DestructiveButton size="sm" onClick={(e) => { e.stopPropagation(); handleDisconnect(); }} disabled={isActionLoading}>
                {isDisconnecting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Desconectar WhatsApp"}
              </DestructiveButton>
            )}
            
            <SecondaryButton size="sm" onClick={(e) => { e.stopPropagation(); refetchStatus(); }} disabled={isActionLoading || isLoadingStatus}>
              <RefreshCw className="h-3 w-3 mr-1" /> Atualizar Status
            </SecondaryButton>
          </div>
        </>
      )}

      {/* Modal para escolher método de conexão */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como você quer conectar?</DialogTitle>
            <DialogDescription>
              Escolha o método de conexão para o WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button variant="outline" onClick={() => handleConnectWithMethod('qr')}>
              <QrCode className="mr-2 h-4 w-4" /> Conectar com QR Code
            </Button>
            <Button variant="outline" onClick={() => { setIsConnectModalOpen(false); setConnectMethod('pair'); }}> {/* Abre o modal de input de telefone */}
              <Phone className="mr-2 h-4 w-4" /> Conectar com Pair Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Pair Code (se necessário) */}
      <Dialog open={connectMethod === 'pair' && !pairCodeData} onOpenChange={() => setConnectMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar com Pair Code</DialogTitle>
            <DialogDescription>
              Insira o número de telefone do WhatsApp que você deseja conectar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Ex: 5511999999999"
              value={pairCodePhone}
              onChange={(e) => setPairCodePhone(e.target.value)}
            />
            <Button onClick={handleConnectWithPairCodePhone}>
              Gerar Pair Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsappStatusCompact;