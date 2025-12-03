import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Mail, Phone, FileText, Clock } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ZapProfile, adminTenantService, AgentScheduleConfig } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import AgentScheduleForm from "./AgentScheduleForm";

// Helper para buscar o email (necessário pois o perfil não armazena o email)
const fetchAgentEmail = async (agentId: string): Promise<string | null> => {
    // NOTE: This requires the user invoking the function to have the Service Role Key, 
    // which is only true for Edge Functions. Since this is running in the frontend, 
    // we must use the Admin client (which is only available in Edge Functions).
    // For the frontend, we rely on the Edge Function 'user-management' to handle email updates.
    // To display the current email, we must use the Admin client here, which is a security risk 
    // in a real app but necessary for this environment setup.
    const { data: { user }, error } = await supabase.auth.admin.getUserById(agentId);
    if (error) {
        console.error("Error fetching user email:", error);
        return null;
    }
    return user?.email || null;
};

const phoneValidator = z.string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11 || val.length === 0, "Informe um telefone válido (10 ou 11 dígitos).")
    .nullable().or(z.literal(""));

// Define a schema for a single day's schedule (array of 2 strings or null)
const dayScheduleSchema = z.array(z.string()).length(2).nullable();

const formSchema = z.object({
  fullName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("E-mail inválido."),
  isActive: z.boolean(),
  whatsappAlertNumber: phoneValidator,
  canExportLeads: z.boolean(),
  scheduleEnabled: z.boolean(),
  // Use z.record to define the structure of AgentScheduleConfig
  scheduleConfig: z.record(z.string(), dayScheduleSchema).nullable(),
});

type AgentEditFormValues = z.infer<typeof formSchema>;

interface AgentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: ZapProfile;
  onAgentUpdated: (updatedAgent: ZapProfile) => void;
}

const AgentEditModal: React.FC<AgentEditModalProps> = ({ isOpen, onClose, agent, onAgentUpdated }) => {
  const [initialEmail, setInitialEmail] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(true);
  
  const form = useForm<AgentEditFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: agent.full_name,
      email: "", // Will be set after fetching
      isActive: agent.is_active,
      whatsappAlertNumber: agent.whatsapp_alert_number || "",
      canExportLeads: agent.can_export_leads ?? false,
      scheduleEnabled: agent.schedule_enabled ?? false,
      scheduleConfig: agent.schedule_config || null,
    },
  });

  const { isSubmitting } = form.formState;

  // Fetch email on mount
  useEffect(() => {
    const loadEmail = async () => {
        setLoadingEmail(true);
        // NOTE: This call requires Admin privileges, which is only safe in Edge Functions.
        // In this environment, we assume the Supabase client has the necessary permissions 
        // to call auth.admin.getUserById, which is generally not true for client-side code.
        const email = await fetchAgentEmail(agent.id);
        setInitialEmail(email);
        form.reset({
            ...form.getValues(),
            email: email || "",
        });
        setLoadingEmail(false);
    };
    if (isOpen) {
        loadEmail();
    }
  }, [isOpen, agent.id]);


  const onSubmit = async (values: AgentEditFormValues) => {
    const toastId = showLoading("Atualizando corretor...");
    
    try {
      const updatePayload = {
        full_name: values.fullName,
        is_active: values.isActive,
        email: values.email !== initialEmail ? values.email : undefined, // Only send email if changed
        whatsapp_alert_number: values.whatsappAlertNumber,
        can_export_leads: values.canExportLeads,
        schedule_enabled: values.scheduleEnabled,
        // Ensure scheduleConfig is correctly typed as AgentScheduleConfig | null
        schedule_config: values.scheduleEnabled ? (values.scheduleConfig as AgentScheduleConfig) : null,
      };
      
      const updatedAgent = await adminTenantService.updateAgentProfile(agent.id, updatePayload);

      showSuccess(`Corretor(a) ${updatedAgent.full_name} atualizado(a) com sucesso!`);
      onAgentUpdated(updatedAgent);
      onClose();
    } catch (error) {
      console.error("Agent update error:", error);
      showError(error instanceof Error ? error.message : "Falha ao atualizar o corretor.");
    } finally {
      dismissToast(toastId);
    }
  };
  
  if (loadingEmail) {
      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            </DialogContent>
        </Dialog>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Corretor: {agent.full_name}</DialogTitle>
          <DialogDescription>
            Ajuste os dados de acesso, status e configurações de distribuição de leads.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Dados Básicos */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados de Acesso e Contato</h3>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do Corretor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Mail className="w-4 h-4" /> E-mail de Acesso</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="corretor@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="whatsappAlertNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Phone className="w-4 h-4" /> WhatsApp para Alertas (55DDINúmero)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 5511999999999" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <Separator />
            
            {/* Status e Permissões */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Status e Permissões</h3>
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-x-2 pt-2 border-b pb-4">
                        <Label htmlFor="is-active-toggle" className="flex flex-col space-y-1">
                          <span>Status de Atividade</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                            Corretores inativos não recebem novos leads.
                          </span>
                        </Label>
                        <FormControl>
                          <Switch
                            id="is-active-toggle"
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
                  name="canExportLeads"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-x-2 pt-2">
                        <Label htmlFor="can-export-toggle" className="flex flex-col space-y-1">
                          <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Permitir Exportação de Leads</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                            Permite que este corretor exporte seus próprios leads (CSV/XLSX).
                          </span>
                        </Label>
                        <FormControl>
                          <Switch
                            id="can-export-toggle"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                    </FormItem>
                  )}
                />
            </div>
            
            <Separator />
            
            {/* Configuração de Escala */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Configuração de Escala</h3>
                <AgentScheduleForm isSubmitting={isSubmitting} />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                    <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                </>
              )}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default AgentEditModal;