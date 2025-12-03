import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { submitSupportTicket } from "@/services/zapCorretor";

const phoneValidator = z.string().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Telefone inválido. Use o formato (XX) XXXXX-XXXX ou similar.")
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, "O telefone deve ter 10 ou 11 dígitos (DDD + número).")
    .nullable().or(z.literal(""));

const formSchema = z.object({
  name: z.string().min(3, "O nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  phone: phoneValidator,
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres.").max(1500, "A mensagem não pode exceder 1500 caracteres."),
});

type SupportFormValues = z.infer<typeof formSchema>;

interface SupportFormProps {
  onBackToHome: () => void;
}

const SupportForm: React.FC<SupportFormProps> = ({ onBackToHome }) => {
  const form = useForm<SupportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const { isSubmitting } = form.formState;
  const messageLength = form.watch("message")?.length || 0;

  const onSubmit = async (values: SupportFormValues) => {
    const toastId = showLoading("Enviando ticket de suporte...");
    
    try {
      await submitSupportTicket({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        message: values.message,
      });

      showSuccess("Ticket enviado com sucesso! Entraremos em contato em breve.");
      form.reset();
    } catch (error) {
      console.error("Support submission error:", error);
      showError(error instanceof Error ? error.message : "Falha ao enviar o ticket de suporte.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-xl font-bold text-center">Suporte</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
            Descreva seu problema ou dúvida em detalhes.
        </p>
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Seu nome e sobrenome" {...field} />
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
                <Input placeholder="(XX) XXXXX-XXXX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem</FormLabel>
              <FormControl>
                <Textarea 
                    placeholder="Descreva seu problema ou dúvida em detalhes" 
                    rows={5}
                    {...field} 
                />
              </FormControl>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span></span>
                <span>{messageLength} / 1500</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
                <Send className="mr-2 h-4 w-4" /> Enviar Ticket
            </>
          )}
        </Button>
        
        <div className="text-center mt-4">
            <Button variant="link" type="button" onClick={onBackToHome} className="text-sm">
                Voltar para a página inicial
            </Button>
        </div>
      </form>
    </Form>
  );
};

export default SupportForm;