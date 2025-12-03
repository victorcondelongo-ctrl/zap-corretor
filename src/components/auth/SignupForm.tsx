import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, Users, User } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card"; // Added imports

// --- Constants ---
const PRICE_INDIVIDUAL = 297;
const PRICE_AGENT = 197;
const MIN_AGENTS_CORRETORA = 3;

// --- Validation Schemas ---
const passwordStrength = z.string().min(8, "Mínimo de 8 caracteres.")
    .regex(/[A-Z]/, "Deve conter uma letra maiúscula.")
    .regex(/[a-z]/, "Deve conter uma letra minúscula.")
    .regex(/[0-9]/, "Deve conter um número.")
    .regex(/[^A-Za-z0-9]/, "Deve conter um caractere especial.");

const nameValidator = z.string().refine(name => {
    const words = name.trim().split(/\s+/);
    return words.length >= 2 && words.every(word => word.length >= 3);
}, "Escreva seu nome completo.");

const phoneValidator = z.string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, "Informe um telefone válido.")
    .or(z.literal("")); // Allow empty string if not required, though form requires it

const formSchema = z.object({
  fullName: nameValidator,
  email: z.string().email("Informe um e-mail válido."),
  phone: phoneValidator,
  password: passwordStrength,
  confirmPassword: z.string(),
  planType: z.enum(["individual", "corretora"]),
  agentCount: z.number().int().min(1, "Deve haver pelo menos 1 corretor."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
}).refine((data) => {
    if (data.planType === 'corretora') {
        return data.agentCount >= MIN_AGENTS_CORRETORA;
    }
    return true;
}, {
    message: `O plano Corretora exige no mínimo ${MIN_AGENTS_CORRETORA} corretores.`,
    path: ["agentCount"],
});

type SignupFormValues = z.infer<typeof formSchema>;

interface SignupFormProps {
  onLoginClick: () => void;
}

// --- Helper for Phone Masking ---
const maskPhone = (value: string) => {
    if (!value) return value;
    const numbers = value.replace(/\D/g, '');
    const length = numbers.length;

    if (length <= 2) return `(${numbers}`;
    if (length <= 7) return `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
    if (length <= 10) return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6, 10)}`;
    return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7, 11)}`;
};


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
      planType: "individual",
      agentCount: 1,
    },
    mode: "onChange",
  });

  const { isSubmitting } = form.formState;
  const passwordValue = form.watch("password");
  const planType = form.watch("planType");
  const agentCount = form.watch("agentCount");
  const phoneValue = form.watch("phone");

  const monthlyPrice = useMemo(() => {
    if (planType === 'individual') {
        return PRICE_INDIVIDUAL;
    }
    // Corretora plan: minimum 3 agents, price per agent
    const count = Math.max(agentCount, MIN_AGENTS_CORRETORA);
    return count * PRICE_AGENT;
  }, [planType, agentCount]);
  
  const totalSixMonths = monthlyPrice * 6;

  const onSubmit = async (values: SignupFormValues) => {
    const toastId = showLoading("Criando sua conta e assinatura...");
    
    try {
      // 1. Simular criação da assinatura Asaas
      console.log(`[Asaas Simulation] Criando assinatura de 6 meses: R$ ${totalSixMonths.toFixed(2)} (Plano: ${values.planType}, Corretores: ${values.agentCount})`);
      
      // 2. Determinar o Role e Tenant Name
      const role: 'AGENT' | 'ADMIN_TENANT' = values.planType === 'individual' ? 'AGENT' : 'ADMIN_TENANT';
      const tenantName = values.planType === 'individual' ? `Corretor ${values.fullName}` : `Corretora de ${values.fullName}`;

      // 3. Criar o usuário no Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
            data: {
                full_name: values.fullName,
                phone: values.phone,
                role: role, // Passando o role para o trigger handle_new_user
                tenant_name: tenantName, // Passando o nome do tenant (se for ADMIN_TENANT)
            }
        }
      });

      if (error) {
        throw error;
      }
      
      // NOTE: O trigger handle_new_user precisará ser atualizado para criar o tenant e o perfil
      // se o role for ADMIN_TENANT, ou apenas o perfil se for AGENT.
      
      showSuccess("Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro e finalize o pagamento.");
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
        <h3 className="text-lg font-semibold mb-2">Dados Pessoais</h3>
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
                <Input 
                    placeholder="(11) 99999-9999" 
                    {...field} 
                    value={maskPhone(field.value)}
                    onChange={(e) => {
                        // Remove non-digits before passing to validation
                        const rawValue = e.target.value.replace(/\D/g, '');
                        field.onChange(rawValue);
                    }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <h3 className="text-lg font-semibold pt-4 mb-2">Segurança</h3>

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
        
        <h3 className="text-lg font-semibold pt-4 mb-2">Escolha Seu Plano</h3>

        <FormField
          control={form.control}
          name="planType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo de Conta</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className={cn("flex items-center space-x-3 space-y-0 p-3 border rounded-md", field.value === 'individual' && 'border-primary ring-1 ring-primary')}>
                    <FormControl>
                      <RadioGroupItem value="individual" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2">
                        <User className="w-4 h-4" /> Corretor Individual (R$ {PRICE_INDIVIDUAL}/mês)
                    </FormLabel>
                  </FormItem>
                  <FormItem className={cn("flex items-center space-x-3 space-y-0 p-3 border rounded-md", field.value === 'corretora' && 'border-primary ring-1 ring-primary')}>
                    <FormControl>
                      <RadioGroupItem value="corretora" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2">
                        <Users className="w-4 h-4" /> Corretora (R$ {PRICE_AGENT}/agente/mês)
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {planType === 'corretora' && (
            <FormField
              control={form.control}
              name="agentCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Corretores (Mínimo {MIN_AGENTS_CORRETORA})</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        placeholder="3" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        min={MIN_AGENTS_CORRETORA}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        
        <Card className="bg-secondary/50">
            <CardContent className="p-4">
                <p className="text-sm font-semibold">Resumo da Assinatura (6 meses)</p>
                <p className="text-2xl font-bold mt-1 text-primary">
                    R$ {monthlyPrice.toFixed(2).replace('.', ',')} / mês
                </p>
                <p className="text-sm text-muted-foreground">
                    Total a pagar (6 meses): R$ {totalSixMonths.toFixed(2).replace('.', ',')}
                </p>
            </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Criar Conta e Pagar Assinatura"
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