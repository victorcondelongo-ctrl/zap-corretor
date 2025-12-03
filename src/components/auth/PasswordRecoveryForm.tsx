import React, { useState } from "react";
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

const formSchema = z.object({
  email: z.string().email("E-mail inválido."),
});

type RecoveryFormValues = z.infer<typeof formSchema>;

interface PasswordRecoveryFormProps {
  onLoginClick: () => void;
}

const PasswordRecoveryForm: React.FC<PasswordRecoveryFormProps> = ({ onLoginClick }) => {
  const form = useForm<RecoveryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: RecoveryFormValues) => {
    const toastId = showLoading("Enviando link de recuperação...");
    
    try {
      // The redirectTo URL must be the full URL of the login page
      const redirectTo = `${window.location.origin}/login`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: redirectTo,
      });

      if (error) {
        throw error;
      }
      
      showSuccess("Link de recuperação enviado! Verifique sua caixa de entrada.");
      form.reset();
      onLoginClick(); // Optionally redirect back to login after success
    } catch (error) {
      console.error("Password recovery error:", error);
      showError(error instanceof Error ? error.message : "Falha ao enviar o link de recuperação.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-xl font-bold text-center">Recuperar Senha</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
            Digite seu e-mail para receber um link de recuperação.
        </p>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="seu@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Enviar Link de Recuperação"
          )}
        </Button>
        
        <div className="text-center mt-4">
            <Button variant="link" type="button" onClick={onLoginClick} className="text-sm">
                Lembrou a senha? Faça login
            </Button>
        </div>
      </form>
    </Form>
  );
};

export default PasswordRecoveryForm;