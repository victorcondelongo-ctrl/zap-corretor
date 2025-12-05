import React from "react";
import { useUazapiInstanceStatus } from "@/hooks/use-uazapi-status";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, QrCode, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppStatusBadgeProps {
  className?: string;
}

const WhatsAppStatusBadge: React.FC<WhatsAppStatusBadgeProps> = ({ className }) => {
  const { statusData, isLoadingStatus } = useUazapiInstanceStatus();

  if (isLoadingStatus) {
    return (
      <Badge variant="secondary" className={cn("flex items-center gap-1", className)}>
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
      </Badge>
    );
  }

  const status = statusData?.status || 'unknown';
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "secondary";
  let text = "Status WhatsApp";
  let Icon: React.ElementType = Clock;

  switch (status) {
    case 'connected':
      variant = 'success';
      text = 'Conectado';
      Icon = CheckCircle;
      break;
    case 'disconnected':
      variant = 'destructive';
      text = 'Desconectado';
      Icon = XCircle;
      break;
    case 'waiting_qr':
    case 'waiting_pair':
      variant = 'warning';
      text = 'Aguardando Conexão';
      Icon = QrCode;
      break;
    case 'created':
      variant = 'default';
      text = 'Instância Criada';
      Icon = Zap;
      break;
    case 'no_instance':
      variant = 'secondary';
      text = 'Sem Instância';
      Icon = Zap;
      break;
    case 'error':
      variant = 'destructive';
      text = 'Erro';
      Icon = XCircle;
      break;
    default:
      variant = 'secondary';
      text = 'Desconhecido';
      Icon = Clock;
  }

  return (
    <Badge variant={variant} className={cn("flex items-center gap-1", className)}>
      <Icon className="h-3 w-3" /> {text}
    </Badge>
  );
};

export default WhatsAppStatusBadge;