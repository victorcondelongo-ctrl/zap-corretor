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
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";

const formSchema = z.object({
  fullName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type AgentFormValues = z.infer<typeof formSchema>;

interface CreateAgentFormProps {
  onAgentCreated: () => void;
  onClose: () => void;
}

const CreateAgentForm: React.FC<CreateAgentFormProps> = ({ onAgentCreated, onClose }) => {
  const { profile } = useSession();
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: AgentFormValues) => {
    if (!profile || profile.role !== 'ADMIN_TENANT' || !profile.tenant_id) {
        showError("Erro de permissão: Perfil de administrador ou Tenant ID ausente.");
        return;
    }

    const toastId = showLoading("Criando novo corretor...");
    
    try {
      // 1. Chamar a Edge Function para criar o usuário e o perfil
      // Reutilizamos a Edge Function 'user-management' que lida com a criação de usuários não-SA
      const { data, error } = await supabase.functions.invoke("user-management", {
        body: {
          email: values.email,
          password: values.password,
          full_name: values.fullName,
          role: "AGENT",
          tenant_id: profile.tenant_id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.error) {
          throw new Error(data.error);
      }

      showSuccess(`Corretor(a) ${values.fullName} criado(a) com sucesso!`);
      onAgentCreated();
      onClose();
    } catch (error) {
      console.error("Agent creation error:", error);
      showError(error instanceof Error ? error.message : "Falha ao criar o corretor.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="corretor@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Cadastrar Corretor"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CreateAgentForm;