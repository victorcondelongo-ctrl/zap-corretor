import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle, XCircle, QrCode, Clock, RefreshCw } from "lucide-react";
import { useUazapiInstanceStatus } from "@/hooks/use-uazapi-status";
import { useUazapiInstanceActions } from "@/hooks/use-uazapi-actions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrimaryButton, DestructiveButton } from "@/components/ui/CustomButton"; // Import Custom Buttons
import { cn } from "@/lib/utils";

const WhatsAppConnectionCard: React.FC = () => {
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
  
  const isActionLoading = isCreating || isConnecting || isDisconnecting;

  const handleConnect = async () => {
    setQrCodeData(null);
    setPairCodeData(null);
    const response = await connectInstance();
    
    if (response?.qrcode_base64) {
      setQrCodeData(response.qrcode_base64);
    } else if (response?.pairingCode) {
      setPairCodeData(response.pairingCode);
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
        return { text: "Conectado", variant: "success", icon: CheckCircle };
      case 'disconnected':
        return { text: "Desconectado", variant: "destructive", icon: XCircle };
      case 'waiting_qr':
      case 'waiting_pair':
        return { text: "Aguardando Conexão", variant: "warning", icon: QrCode };
      case 'created':
        return { text: "Instância Criada", variant: "default", icon: Zap };
      case 'no_instance':
        return { text: "Nenhuma Instância", variant: "secondary", icon: Zap };
      case 'error':
        return { text: "Erro", variant: "destructive", icon: XCircle };
      default:
        return { text: "Status Desconhecido", variant: "secondary", icon: Clock };
    }
  }, [statusData]);
  
  const Icon = statusInfo.icon;
  const statusText = statusInfo.text;
  const statusVariant = statusInfo.variant as "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

  return (
    <Card className={cn("h-full flex flex-col rounded-xl shadow-md transition-all duration-300 hover:shadow-lg", statusData?.status === 'connected' ? 'border-success/50' : '')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand" /> Status do WhatsApp
        </CardTitle>
        <Badge variant={statusVariant} className="capitalize">
          {statusText}
        </Badge>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 pt-4">
        
        {isLoadingStatus && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando status...
          </div>
        )}
        
        {errorStatus && (
          <p className="text-sm text-destructive">Erro: {errorStatus}</p>
        )}

        {statusData && (
          <>
            {/* Last Update Time */}
            {statusData.updated_at && (
                <p className="text-xs text-muted-foreground">
                    Última atualização: {formatDistanceToNow(new Date(statusData.updated_at), { addSuffix: true, locale: ptBR })}
                </p>
            )}

            {/* QR Code / Pair Code Display */}
            {(qrCodeData || pairCodeData) && (
              <div className="text-center p-4 border rounded-xl bg-brand-soft/50">
                <h4 className="font-medium mb-2">
                    {qrCodeData ? "Escaneie o QR Code" : "Use o Pair Code"}
                </h4>
                {qrCodeData && (
                  <img 
                    src={`data:image/png;base64,${qrCodeData}`} 
                    alt="QR Code de Conexão" 
                    className="mx-auto w-48 h-48 object-contain"
                  />
                )}
                {pairCodeData && (
                    <p className="text-2xl font-bold text-brand tracking-widest">{pairCodeData}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                    Mantenha esta tela aberta. O status será atualizado automaticamente.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {statusData.status === 'no_instance' && (
                <PrimaryButton onClick={createInstance} disabled={isActionLoading}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Instância Uazapi"}
                </PrimaryButton>
              )}
              
              {(statusData.status === 'disconnected' || statusData.status === 'created' || statusData.status === 'waiting_qr' || statusData.status === 'waiting_pair') && statusData.hasInstance && (
                <PrimaryButton onClick={handleConnect} disabled={isActionLoading}>
                  {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Conectar / Reconectar WhatsApp"}
                </PrimaryButton>
              )}
              
              {statusData.status === 'connected' && (
                <DestructiveButton onClick={handleDisconnect} disabled={isActionLoading}>
                  {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Desconectar WhatsApp"}
                </DestructiveButton>
              )}
              
              <Button onClick={refetchStatus} variant="outline" size="sm" disabled={isActionLoading || isLoadingStatus} className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar Status Manualmente
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppConnectionCard;