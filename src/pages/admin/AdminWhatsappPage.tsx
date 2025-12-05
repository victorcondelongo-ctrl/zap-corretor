import React from "react";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const AdminWhatsappPage = () => {
  const { profile } = useSession();
  const tenantName = profile?.tenant_name || "Corretora";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand">WhatsApp Central da {tenantName}</h1>
      <p className="text-muted-foreground">Gerencie a conexão do número central do WhatsApp usado para receber leads e enviar notificações.</p>

      <div className="grid grid-cols-1 gap-6">
        {/* O status e ações principais do WhatsApp Central agora estão no sidebar */}
        {/* Este espaço pode ser usado para configurações avançadas, como templates de mensagem, etc. */}
        
        {/* Central Number Info */}
        <Card className="rounded-xl shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Número Central Configurado
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
      
      <Card className="rounded-xl shadow-md">
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