import React, { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, MessageSquare, Save, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { superadminService, GlobalSettings } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { PrimaryButton } from "@/components/ui/CustomButton";

const formSchema = z.object({
  n8nWebhookUrl: z.string().url("URL inválida.").nullable().or(z.literal("")),
  whatsappNotificationNumber: z.string().regex(/^55\d{10,11}$/, "O telefone deve estar no formato DDI+DDD+Número (ex: 5511999999999).").nullable().or(z.literal("")),
});

type IntegrationsFormValues = z.infer<typeof formSchema>;

const SuperadminIntegrationsPage = () => {
  const [loading, setLoading] = React.useState(true);

  const form = useForm<IntegrationsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      n8nWebhookUrl: "",
      whatsappNotificationNumber: "",
    },
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await superadminService.getGlobalSettings();
      form.reset({
        n8nWebhookUrl: settings.n8n_webhook_url || "",
        whatsappNotificationNumber: settings.whatsapp_notification_number || "",
      });
    } catch (error) {
      showError("Erro ao carregar configurações globais: " + (error instanceof Error ? error.message : "Desconhecido"));
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onSubmit = async (values: IntegrationsFormValues) => {
    const toastId = showLoading("Salvando configurações de integração...");
    try {
      await superadminService.saveGlobalSettings({
        n8n_webhook_url: values.n8nWebhookUrl || null,
        whatsapp_notification_number: values.whatsappNotificationNumber || null,
      });
      
      showSuccess("Configurações de integração salvas com sucesso!");
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
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando integrações...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand">Integrações Globais</h1>
      <p className="text-muted-foreground">Configure integrações de terceiros e números de notificação da plataforma.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Webhook n8n */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="w-5 h-5" /> Webhook n8n (CRM Externo)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                URL para onde os dados de leads qualificados serão enviados automaticamente.
              </p>
              <FormField
                control={form.control}
                name="n8nWebhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Webhook</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://n8n.suaempresa.com/webhook/..." 
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

          {/* WhatsApp Notification Number */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Número de Notificação WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Este número será usado para enviar alertas de "assuma esta conversa" aos corretores. Deve estar no formato 55DDINúmero.
              </p>
              <FormField
                control={form.control}
                name="whatsappNotificationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone de Notificação</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 5511999999999" 
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
          
          <PrimaryButton type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar Configurações Globais
              </>
            )}
          </PrimaryButton>
        </form>
      </Form>
    </div>
  );
};

export default SuperadminIntegrationsPage;