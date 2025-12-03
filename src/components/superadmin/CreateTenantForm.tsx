import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Users } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { superadminService, ZapTenant, ZapProfile } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// --- Constants ---
const MIN_AGENTS_CORRETORA = 3;

const formSchema = z.object({
  accountType: z.enum(["tenant", "individual"]),
  tenantName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres.").optional(),
  fullName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  adminEmail: z.string().email("E-mail inválido."),
  adminPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  baseMonthlyLeadsLimit: z.number().int().min(100, "O limite deve ser de pelo menos 100 leads.").optional(),
}).superRefine((data, ctx) => {
    if (data.accountType === 'tenant') {
        if (!data.tenantName || data.tenantName.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "O nome da Corretora é obrigatório.",
                path: ['tenantName'],
            });
        }
        if (!data.baseMonthlyLeadsLimit || data.baseMonthlyLeadsLimit < 100) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "O limite de leads é obrigatório para Corretoras.",
                path: ['baseMonthlyLeadsLimit'],
            });
        }
    }
});

type TenantFormValues = z.infer<typeof formSchema>;

interface CreateTenantFormProps {
  onTenantCreated: (tenant: ZapTenant | ZapProfile) => void;
  onClose: () => void;
}

const CreateTenantForm: React.FC<CreateTenantFormProps> = ({ onTenantCreated, onClose }) => {
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: "tenant",
      tenantName: "",
      fullName: "",
      adminEmail: "",
      adminPassword: "",
      baseMonthlyLeadsLimit: 3000,
    },
  });

  const { isSubmitting } = form.formState;
  const accountType = form.watch('accountType');

  const onSubmit = async (values: TenantFormValues) => {
    const toastId = showLoading(`Criando ${values.accountType === 'tenant' ? 'Corretora' : 'Corretor Avulso'}...`);
    try {
      let result: ZapTenant | ZapProfile;

      if (values.accountType === 'tenant') {
        // 1. Criar Corretora (ADMIN_TENANT)
        result = await superadminService.createTenantAndAdmin({
          tenantName: values.tenantName!,
          adminEmail: values.adminEmail,
          adminPassword: values.adminPassword,
          leadsLimit: values.baseMonthlyLeadsLimit!,
        });
        showSuccess(`Corretora "${values.tenantName}" criada! Admin criado em ${values.adminEmail}.`);
      } else {
        // 2. Criar Corretor Avulso (AGENT)
        result = await superadminService.createIndividualAgent({
            fullName: values.fullName,
            email: values.adminEmail,
            password: values.adminPassword,
        });
        showSuccess(`Corretor Avulso "${values.fullName}" criado! Login: ${values.adminEmail}.`);
      }

      onTenantCreated(result);
      onClose();
    } catch (error) {
      console.error("Creation error:", error);
      showError(error instanceof Error ? error.message : "Falha ao criar a conta.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo de Criação</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className={cn("flex items-center space-x-3 space-y-0 p-3 border rounded-md flex-1", field.value === 'tenant' && 'border-primary ring-1 ring-primary')}>
                    <FormControl>
                      <RadioGroupItem value="tenant" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2">
                        <Users className="w-4 h-4" /> Corretora
                    </FormLabel>
                  </FormItem>
                  <FormItem className={cn("flex items-center space-x-3 space-y-0 p-3 border rounded-md flex-1", field.value === 'individual' && 'border-primary ring-1 ring-primary')}>
                    <FormControl>
                      <RadioGroupItem value="individual" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2">
                        <User className="w-4 h-4" /> Corretor Avulso
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {accountType === 'tenant' && (
            <FormField
              control={form.control}
              name="tenantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Corretora</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Corretora Alpha Seguros" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{accountType === 'tenant' ? 'Nome do Admin' : 'Nome do Corretor'}</FormLabel>
              <FormControl>
                <Input placeholder="Nome Completo" {...field} />
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
              <FormLabel>E-mail de Acesso</FormLabel>
              <FormControl>
                <Input type="email" placeholder="usuario@email.com" {...field} />
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
              <FormLabel>Senha Inicial</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {accountType === 'tenant' && (
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
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            `Criar ${accountType === 'tenant' ? 'Corretora e Admin' : 'Corretor Avulso'}`
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CreateTenantForm;