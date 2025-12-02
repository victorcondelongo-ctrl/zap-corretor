import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const SuperadminSettingsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Configurações Globais</h1>
      <p className="text-muted-foreground">Ajustes gerais do SaaS, como nome da plataforma e identidade visual.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" /> Identidade Visual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Campos para nome da plataforma, upload de logo e definição de cores primárias.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminSettingsPage;