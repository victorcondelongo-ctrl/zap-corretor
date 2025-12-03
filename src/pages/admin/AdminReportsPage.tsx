import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Filter } from "lucide-react";

const AdminReportsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Relatórios da Corretora</h1>
      <p className="text-muted-foreground">Análise de desempenho de leads, corretores e fontes de tráfego.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Seleção de período, corretor e status para gerar relatórios.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" /> Desempenho por Corretor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Gráficos e tabelas de performance dos agentes.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportsPage;