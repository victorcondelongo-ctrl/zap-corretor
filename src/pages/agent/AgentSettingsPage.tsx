import React, { useEffect, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Zap, MessageSquare, Save, Loader2, Phone, Clock, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { agentService, ZapAgentSettings, AgentScheduleConfig } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/contexts/SessionContext";
import AgentScheduleForm from "@/components/admin/AgentScheduleForm"; // Reusing the schedule form

const phoneValidator = z.string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11 || val.length === 0, "Informe um telefone válido (10 ou 11 dígitos).")
    .nullable().or(z.literal(""));

// Define a schema for a single day's schedule (array of 2 strings or null)
const dayScheduleSchema = z.array(z.string()).length(2).nullable();

const formSchema = z.object({
  aiPrompt: z.string().nullable(),
  followup30minEnabled: z.boolean(),
  followup24hEnabled: z.boolean(),
  // New fields for independent agents
  whatsappAlertNumber: phoneValidator,
  canExportLeads: z.boolean(),
  scheduleEnabled: z.boolean(),
  scheduleConfig: z.record(z.string(), dayScheduleSchema).nullable(),
});

type AgentSettingsFormValues = z.infer<typeof formSchema>;

const AgentSettingsPage = () => {
  const { profile, refreshProfile } = useSession();
  const [loading, setLoading] = React.useState(true);
  const isIndependentAgent = profile?.tenant_id === null;

  const form = useForm<AgentSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aiPrompt: "",
      followup30minEnabled: true,
      followup24hEnabled: true,
      whatsappAlertNumber: "",
      canExportLeads: false,
      scheduleEnabled: false,
      scheduleConfig: null,
    },
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await agentService.getSettings();
      
      // Fetch profile again to get the latest whatsapp_alert_number
      // NOTE: getCurrentProfile now fetches settings, so we use the number from the settings object
      
      form.reset({
        aiPrompt: settings.ai_prompt || "",
        followup30minEnabled: settings.followup_30min_enabled,
        followup24hEnabled: settings.followup_24h_enabled,
        whatsappAlertNumber: settings.whatsapp_alert_number || "",
        canExportLeads: settings.can_export_leads,
        scheduleEnabled: settings.schedule_enabled,
        scheduleConfig: settings.schedule_config,
      });
    } catch (error) {
      showError("Erro ao carregar configurações: " + (error instanceof Error ? error.message : "Desconhecido"));
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onSubmit = async (values: AgentSettingsFormValues) => {
    const toastId = showLoading("Salvando configurações...");
    try {
      const settingsPayload: Partial<ZapAgentSettings> = {
        ai_prompt: values.aiPrompt,
        followup_30min_enabled: values.followup30minEnabled,
        followup_24h_enabled: values.followup24hEnabled,
        can_export_leads: values.canExportLeads,
        schedule_enabled: values.scheduleEnabled,
        // Ensure scheduleConfig is correctly typed as AgentScheduleConfig | null
        schedule_config: values.scheduleEnabled ? (values.scheduleConfig as AgentScheduleConfig) : null,
        whatsapp_alert_number: values.whatsappAlertNumber, // FIX: Now correctly typed in ZapAgentSettings
      };
      
      await agentService.saveSettings(settingsPayload);
      
      // If independent agent updated their number, refresh profile context
      if (isIndependentAgent) {
          await refreshProfile();
      }
      
      showSuccess("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Settings save error:", error);
      showError(error instanceof Error ? error.message : "Falha ao salvar as configurações.");
    } finally {
      dismissToast(toastId);
    }
  };
  
  // AI is considered enabled if the agent has set a custom prompt.
  const isAiEnabled = !!form.watch('aiPrompt');
  const isSubmitting = form.formState.isSubmitting;

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Configurações do Corretor</h1>
      <p className="text-muted-foreground">Ajuste as configurações da IA e dos follow-ups automáticos para seus leads.</p>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* WhatsApp Alert Number (Editable only for Independent Agents) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" /> Contato e Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
                <FormField
                  control={form.control}
                  name="whatsappAlertNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp para Alertas de Leads (55DDINúmero)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 5511999999999" 
                          {...field} 
                          value={field.value || ''}
                          disabled={isSubmitting || !isIndependentAgent}
                          className={!isIndependentAgent ? "bg-muted/50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                      {!isIndependentAgent && (
                          <p className="text-xs text-muted-foreground mt-2">
                              Seu número de alerta é gerenciado pela sua corretora.
                          </p>
                      )}
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>
          
          <Separator />
          
          {/* Configuração de Escala */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Configuração de Escala</CardTitle>
            </CardHeader>
            <CardContent>
                <AgentScheduleForm isSubmitting={isSubmitting} />
            </CardContent>
          </Card>
          
          <Separator />

          {/* AI Prompt Master */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Prompt Mestre da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Defina o tom e as regras de comunicação que a IA deve seguir ao interagir com seus leads. Deixe em branco para usar o prompt padrão da corretora.
              </p>
              <FormField
                control={form.control}
                name="aiPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt Mestre</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Você é um corretor de seguros amigável e profissional, focado em coletar Nome, CPF, CEP e Placa..."
                        rows={8}
                        {...field}
                        value={field.value || ''}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Follow-up Toggles and Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" /> Automação e Permissões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* AI Status (Read-only based on prompt presence) */}
              <div className="flex items-center justify-between border-b pb-4">
                <Label htmlFor="ai-status" className="flex flex-col space-y-1">
                  <span>Status da IA de Atendimento</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    A IA está ativa se o Prompt Mestre estiver preenchido.
                  </span>
                </Label>
                <Badge variant={isAiEnabled ? "success" : "destructive"}>
                    {isAiEnabled ? "ATIVO" : "PADRÃO/INATIVO"}
                </Badge>
              </div>
              
              {/* Export Permission (Editable only for Independent Agents) */}
              <FormField
                control={form.control}
                name="canExportLeads"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-x-2 border-b pb-4">
                    <Label htmlFor="can-export-toggle" className="flex flex-col space-y-1">
                      <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Permitir Exportação de Leads</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        Permite que você exporte seus leads (CSV/XLSX).
                      </span>
                    </Label>
                    <FormControl>
                      <Switch
                        id="can-export-toggle"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting || !isIndependentAgent}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followup30minEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-x-2">
                    <Label htmlFor="followup-30min-toggle" className="flex flex-col space-y-1">
                      <span>Follow-up 1 (30 minutos)</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        Tenta reengajar o lead 30 minutos após a última mensagem se ele não tiver qualificado.
                      </span>
                    </Label>
                    <FormControl>
                      <Switch
                        id="followup-30min-toggle"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followup24hEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-x-2">
                    <Label htmlFor="followup-24h-toggle" className="flex flex-col space-y-1">
                      <span>Follow-up 2 (24 horas)</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        Tenta reengajar o lead 24 horas após a última mensagem se ele não tiver qualificado.
                      </span>
                    </Label>
                    <FormControl>
                      <Switch
                        id="followup-24h-toggle"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar Configurações
              </>
            )}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
};

export default AgentSettingsPage;