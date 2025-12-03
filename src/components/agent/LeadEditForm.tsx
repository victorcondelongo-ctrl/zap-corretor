import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ZapLead, agentService } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const formSchema = z.object({
  name: z.string().nullable(),
  cpf: z.string().nullable(),
  cep: z.string().nullable(),
  plate: z.string().nullable(),
});

type LeadFormValues = z.infer<typeof formSchema>;

interface LeadEditFormProps {
  lead: ZapLead;
  onLeadUpdated: (updatedLead: ZapLead) => void;
}

const LeadEditForm: React.FC<LeadEditFormProps> = ({ lead, onLeadUpdated }) => {
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: lead.name || "",
      cpf: lead.cpf || "",
      cep: lead.cep || "",
      plate: lead.plate || "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: LeadFormValues) => {
    const toastId = showLoading("Atualizando dados do lead...");
    try {
      const updatedLead = await agentService.updateLeadData(lead.id, {
        name: values.name,
        cpf: values.cpf,
        cep: values.cep,
        plate: values.plate,
      });

      showSuccess("Dados do lead atualizados com sucesso!");
      onLeadUpdated(updatedLead);
    } catch (error) {
      console.error("Lead update error:", error);
      showError(error instanceof Error ? error.message : "Falha ao atualizar os dados do lead.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input placeholder="00000-000" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placa do Carro</FormLabel>
              <FormControl>
                <Input placeholder="ABC-1234" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Salvar Dados
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default LeadEditForm;