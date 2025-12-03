import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldOff, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminBlockedPhonesPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Telefones Bloqueados</h1>
      <p className="text-muted-foreground">Gerencie a lista de telefones que não devem ser contatados pela IA ou agentes.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Importar Lista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Funcionalidade de upload de CSV para importação em massa.</p>
          <Button variant="secondary">
            <Upload className="w-4 h-4 mr-2" /> Fazer Upload CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Lista Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tabela para visualizar e remover telefones bloqueados individualmente.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBlockedPhonesPage;