import React, { useState } from "react";
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

// Custom validation functions
const passwordStrength = z.string().min(8, "Mínimo de 8 caracteres.")
    .regex(/[A-Z]/, "Deve conter uma letra maiúscula.")
    .regex(/[a-z]/, "Deve conter uma letra minúscula.")
    .regex(/[0-9]/, "Deve conter um número.")
    .regex(/[^A-Za-z0-9]/, "Deve conter um caractere especial.");

const nameValidator = z.string().refine(name => {
    const words = name.trim().split(/\s+/);
    if (words.length < 2) return false;
    return words.every(word => word.length >= 3);
}, "O nome deve ter no mínimo duas palavras, cada uma com no mínimo 3 caracteres.");

const phoneValidator = z.string().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Telefone inválido. Use o formato (XX) XXXXX-XXXX ou similar.")
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, "O telefone deve ter 10 ou 11 dígitos (DDD + número).");


const formSchema = z.object({
  fullName: nameValidator,
  email: z.string().email("E-mail inválido."),
  phone: phoneValidator,
  password: passwordStrength,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof formSchema>;

interface SignupFormProps {
  onLoginClick: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onLoginClick }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const { isSubmitting, errors } = form.formState;
  const passwordValue = form.watch("password");

  const onSubmit = async (values: SignupFormValues) => {
    const toastId = showLoading("Criando sua conta...");
    
    try {
      // 1. Criar o usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
            data: {
                full_name: values.fullName,
                phone: values.phone,
            }
        }
      });

      if (error) {
        throw error;
      }
      
      // 2. O trigger handle_new_user cuidará da criação do perfil.
      
      showSuccess("Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro.");
      form.reset();
      onLoginClick(); // Volta para a tela de login
    } catch (error) {
      console.error("Signup error:", error);
      showError(error instanceof Error ? error.message : "Falha ao criar a conta.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome Sobrenome" {...field} />
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
                <Input type="email" placeholder="seu@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input placeholder="(11) 99999-9999" {...field} />
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
              <FormLabel>Senha</FormLabel>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirme sua senha" 
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
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Criar Conta"
          )}
        </Button>
        
        <div className="text-center mt-4">
            <Button variant="link" type="button" onClick={onLoginClick} className="text-sm">
                Já tem uma conta? Faça login
            </Button>
        </div>
      </form>
    </Form>
  );
};

export default SignupForm;