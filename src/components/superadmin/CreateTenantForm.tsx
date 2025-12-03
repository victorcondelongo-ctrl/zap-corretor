import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  tenantName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  adminEmail: z.string().email("E-mail inválido."),
  adminPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
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
      tenantName: "",
      adminEmail: "",
      adminPassword: "",
      baseMonthlyLeadsLimit: 3000,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: TenantFormValues) => {
    const toastId = showLoading("Criando nova corretora e administrador...");
    try {
      const newTenant = await superadminService.createTenantAndAdmin({
        tenantName: values.tenantName,
        adminEmail: values.adminEmail,
        adminPassword: values.adminPassword,
        leadsLimit: values.baseMonthlyLeadsLimit,
      });

      showSuccess(`Corretora "${newTenant.name}" criada! Admin criado em ${values.adminEmail}.`);
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
          name="tenantName"
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
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail do Administrador</FormLabel>
              <FormControl>
                <Input type="email" placeholder="admin@corretora.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha Inicial do Administrador</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
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
            "Criar Corretora e Admin"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CreateTenantForm;