import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminAgentsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Corretores</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Novo Corretor
        </Button>
      </header>
      <p className="text-muted-foreground">Gerencie os corretores (AGENTs) da sua corretora, incluindo criação, ativação e desativação.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Lista de Corretores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A tabela de corretores e as funcionalidades de edição serão implementadas aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgentsPage;