import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { superadminService, ZapTenant } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const formSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  whatsappCentralNumber: z.string().regex(/^\d{10,15}$/, "Número de WhatsApp inválido (apenas dígitos, 10-15 caracteres)."),
  timezone: z.string().min(1, "Fuso horário é obrigatório."),
  baseMonthlyLeadsLimit: z.number().int().min(100, "O limite deve ser de pelo menos 100 leads."),
});

type TenantFormValues = z.infer<typeof formSchema>;

interface CreateTenantFormProps {
  onTenantCreated: (tenant: ZapTenant) => void;
  onClose: () => void;
}

const CreateTenantForm: React.FC<CreateTenantFormProps> = ({ onTenantCreated, onClose }) => {
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      whatsappCentralNumber: "",
      timezone: "America/Sao_Paulo", // Default timezone
      baseMonthlyLeadsLimit: 3000,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: TenantFormValues) => {
    const toastId = showLoading("Criando nova corretora...");
    try {
      const newTenant = await superadminService.createTenant({
        name: values.name,
        whatsappCentralNumber: values.whatsappCentralNumber,
        timezone: values.timezone,
        baseMonthlyLeadsLimit: values.baseMonthlyLeadsLimit,
      });

      showSuccess(`Corretora "${newTenant.name}" criada com sucesso!`);
      onTenantCreated(newTenant);
      onClose();
    } catch (error) {
      console.error("Tenant creation error:", error);
      showError(error instanceof Error ? error.message : "Falha ao criar a corretora.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Corretora</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Corretora Alpha Seguros" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="whatsappCentralNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp Central (Apenas dígitos)</FormLabel>
              <FormControl>
                <Input placeholder="5511987654321" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fuso Horário</FormLabel>
              <FormControl>
                {/* Simplificado para input de texto por enquanto, mas idealmente seria um Select */}
                <Input placeholder="Ex: America/Sao_Paulo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="baseMonthlyLeadsLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite Mensal de Leads</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="3000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Criar Corretora"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CreateTenantForm;