import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug } from "lucide-react";

const SuperadminIntegrationsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Integrações Globais</h1>
      <p className="text-muted-foreground">Configure integrações de terceiros como Asaas (Cobrança) e WhatsApp de Notificações.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5" /> Configuração Asaas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Detalhes da API Key e ambiente de produção/sandbox serão configurados aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminIntegrationsPage;