import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
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
import PasswordChecklist from "./PasswordChecklist";
import { PrimaryButton } from "@/components/ui/CustomButton"; // Import Custom Button

// Validation schema (same as signup)
const passwordStrength = z.string().min(8, "Mínimo de 8 caracteres.")
    .regex(/[A-Z]/, "Deve conter uma letra maiúscula.")
    .regex(/[a-z]/, "Deve conter uma letra minúscula.")
    .regex(/[0-9]/, "Deve conter um número.")
    .regex(/[^A-Za-z0-9]/, "Deve conter um caractere especial.");

const formSchema = z.object({
  password: passwordStrength,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type NewPasswordFormValues = z.infer<typeof formSchema>;

interface NewPasswordFormProps {
  onLoginClick: () => void;
}

const NewPasswordForm: React.FC<NewPasswordFormProps> = ({ onLoginClick }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTokenValidated, setIsTokenValidated] = useState(false);
  
  const form = useForm<NewPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const { isSubmitting } = form.formState;
  const passwordValue = form.watch("password");

  // This useEffect handles the token validation when the user lands on the page
  useEffect(() => {
    // Supabase automatically handles setting the session from the URL hash fragment
    // when the user returns from the recovery email link.
    // We just need to check if a session is now active.
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setIsTokenValidated(true);
            showSuccess("Token validado. Defina sua nova senha.");
        } else {
            showError("Token de recuperação inválido ou expirado. Tente novamente.");
            onLoginClick();
        }
    };
    checkSession();
  }, [onLoginClick]);


  const onSubmit = async (values: NewPasswordFormValues) => {
    const toastId = showLoading("Atualizando senha...");
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        throw error;
      }
      
      showSuccess("Senha atualizada com sucesso! Faça login com sua nova senha.");
      // Clear session and redirect to login
      await supabase.auth.signOut();
      onLoginClick();
    } catch (error) {
      console.error("Password update error:", error);
      showError(error instanceof Error ? error.message : "Falha ao atualizar a senha.");
    } finally {
      dismissToast(toastId);
    }
  };

  if (!isTokenValidated) {
    return (
        <div className="text-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
            <p>Validando token de recuperação...</p>
        </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-xl font-bold text-center">Definir Nova Senha</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
            Sua identidade foi verificada. Digite sua nova senha.
        </p>
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Mínimo de 8 caracteres" 
                    {...field} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <PasswordChecklist password={passwordValue} />
              <FormMessage className="text-destructive" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Nova Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirme sua nova senha" 
                    {...field} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage className="text-destructive" />
            </FormItem>
          )}
        />

        <PrimaryButton type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Atualizar Senha"
          )}
        </PrimaryButton>
      </form>
    </Form>
  );
};

export default NewPasswordForm;