import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Zap, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const AdminSettingsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Configurações da Corretora</h1>
      <p className="text-muted-foreground">Ajuste textos padrão, regras de distribuição de leads e webhooks.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Textos Padrão (AI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Configurações para mensagens de abertura e handoff (transferência para o agente).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" /> Distribuição de Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Definição do modo de distribuição (sequencial, por peso, etc.) e regras de follow-up.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;