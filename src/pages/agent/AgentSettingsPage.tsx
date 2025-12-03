import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Zap, MessageSquare, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const AgentSettingsPage = () => {
  // Placeholder states for settings
  const [isAiEnabled, setIsAiEnabled] = React.useState(true);
  const [isFollowUpEnabled, setIsFollowUpEnabled] = React.useState(true);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Configurações do Corretor</h1>
      <p className="text-muted-foreground">Ajuste as configurações da IA e dos follow-ups automáticos para seus leads.</p>

      {/* AI Prompt Master */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Prompt Mestre da IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Defina o tom e as regras de comunicação que a IA deve seguir ao interagir com seus leads.
          </p>
          <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
            {/* Placeholder for a Textarea/Form field */}
            "Você é um corretor de seguros amigável e profissional..."
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* AI and Follow-up Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" /> Automação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-toggle" className="flex flex-col space-y-1">
              <span>Ativar IA de Atendimento</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Se desativado, a IA não responderá a novos leads ou leads em andamento.
              </span>
            </Label>
            <Switch
              id="ai-toggle"
              checked={isAiEnabled}
              onCheckedChange={setIsAiEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="followup-toggle" className="flex flex-col space-y-1">
              <span>Ativar Follow-ups Automáticos</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Permite que a IA envie mensagens de acompanhamento para leads que não responderam.
              </span>
            </Label>
            <Switch
              id="followup-toggle"
              checked={isFollowUpEnabled}
              onCheckedChange={setIsFollowUpEnabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentSettingsPage;