import React from "react";
import { useUazapiInstanceStatus } from "@/hooks/use-uazapi-status";
import { Loader2, Zap, CheckCircle, XCircle, QrCode, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WhatsappStatusCompactProps {
  isAgent: boolean; // True for independent agents, false for ADMIN_TENANT
}

const WhatsappStatusCompact: React.FC<WhatsappStatusCompactProps> = ({ isAgent }) => {
  const { statusData, isLoadingStatus } = useUazapiInstanceStatus();

  const statusInfo = React.useMemo(() => {
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

  if (isLoadingStatus) {
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando...</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-md text-sm font-medium",
          statusData?.status === 'connected' ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
        )}>
          <Icon className="h-4 w-4" />
          <span>{isAgent ? "Meu WhatsApp" : "WhatsApp Central"}</span>
          <Badge variant={statusVariant} className="ml-auto">
            {statusInfo.text}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{statusInfo.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default WhatsappStatusCompact;