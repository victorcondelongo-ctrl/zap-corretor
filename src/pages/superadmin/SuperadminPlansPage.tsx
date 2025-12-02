import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const SuperadminPlansPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Planos e Limites Globais</h1>
      <p className="text-muted-foreground">Gerencie os parâmetros padrão da plataforma e os planos de assinatura.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Parâmetros Padrão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta seção será implementada para definir limites e configurações de follow-up padrão.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminPlansPage;