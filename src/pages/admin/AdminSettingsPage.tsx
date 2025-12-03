import React, { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Zap, MessageSquare, Save, Loader2, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminTenantService, ZapTenantSettings, DistributionMode } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const distributionModes: { value: DistributionMode, label: string }[] = [
    { value: 'sequential', label: 'Sequencial (Round-Robin)' },
    { value: 'random', label: 'Randômico (Sorteio)' },
    // Weighted and Schedule modes require more complex UI/DB setup, keeping simple for now
    // { value: 'weighted', label: 'Por Peso (Equação)' },
    // { value: 'schedule', label: 'Por Escala/Plantão' },
];

const formSchema = z.object({
  distributionMode: z.enum(['sequential', 'random', 'weighted', 'schedule']), // FIX: Added weighted and schedule
  defaultAiPrompt: z.string().nullable(),
  agentsCanExport: z.boolean(),
});

type AdminSettingsFormValues = z.infer<typeof formSchema>;

const AdminSettingsPage = () => {
  const [loading, setLoading] = React.useState(true);

  const form = useForm<AdminSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distributionMode: 'sequential',
      defaultAiPrompt: "",
      agentsCanExport: false,
    },
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await adminTenantService.getSettings();
      form.reset({
        distributionMode: settings.distribution_mode,
        defaultAiPrompt: settings.default_ai_prompt || "",
        agentsCanExport: settings.agents_can_export,
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

  const onSubmit = async (values: AdminSettingsFormValues) => {
    const toastId = showLoading("Salvando configurações da corretora...");
    try {
      await adminTenantService.saveSettings({
        distribution_mode: values.distributionMode,
        default_ai_prompt: values.defaultAiPrompt,
        agents_can_export: values.agentsCanExport,
      });
      
      showSuccess("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Settings save error:", error);
      showError(error instanceof Error ? error.message : "Falha ao salvar as configurações.");
    } finally {
      dismissToast(toastId);
    }
  };
  
  const isSubmitting = form.formState.isSubmitting;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Configurações da Corretora</h1>
      <p className="text-muted-foreground">Ajuste textos padrão, regras de distribuição de leads e permissões.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Distribuição de Leads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" /> Distribuição de Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="distributionMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo de Distribuição</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modo de distribuição" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {distributionModes.map(mode => (
                            <SelectItem key={mode.value} value={mode.value}>
                                {mode.label}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-sm text-muted-foreground">
                *Modos 'Por Peso' e 'Por Escala' requerem configuração adicional de agentes.
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Textos Padrão (AI) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Prompt Mestre Padrão da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Este prompt define o comportamento padrão da IA para todos os leads. Corretores podem sobrescrever esta configuração em seus próprios painéis.
              </p>
              <FormField
                control={form.control}
                name="defaultAiPrompt"
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

          {/* Permissões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Permissões Globais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="agentsCanExport"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-x-2">
                    <Label htmlFor="agents-can-export-toggle" className="flex flex-col space-y-1">
                      <span>Permitir Exportação de Leads pelos Corretores</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        Se ativado, todos os corretores poderão exportar seus próprios leads (CSV/XLSX).
                      </span>
                    </Label>
                    <FormControl>
                      <Switch
                        id="agents-can-export-toggle"
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
                <Save className="mr-2 h-4 w-4" /> Salvar Configurações da Corretora
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AdminSettingsPage;