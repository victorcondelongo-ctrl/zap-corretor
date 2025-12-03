import React from "react";
import { useSession } from "@/contexts/SessionContext";
import WhatsAppConnectionCard from "@/components/agent/WhatsAppConnectionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, MessageSquare } from "lucide-react";

const AdminWhatsappPage = () => {
  const { profile } = useSession();
  const tenantName = profile?.tenant_name || "Corretora";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">WhatsApp Central da {tenantName}</h1>
      <p className="text-muted-foreground">Gerencie a conexão do número central do WhatsApp usado para receber leads e enviar notificações.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Status Card (Reusing Agent component, assuming ADMIN manages the central instance) */}
        <WhatsAppConnectionCard />
        
        {/* Central Number Info */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Número Central
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="text-lg font-bold">{profile?.whatsapp_alert_number || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">
                    Este é o número configurado para receber leads e enviar alertas de qualificação. 
                    Para alterá-lo, edite o perfil do administrador.
                </p>
            </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Configurações de Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Configurações de mensagens de boas-vindas e templates serão adicionadas aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWhatsappPage;