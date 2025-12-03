import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { ZapProfile, adminTenantService } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  fullName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  isActive: z.boolean(),
});

type AgentEditFormValues = z.infer<typeof formSchema>;

interface AgentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: ZapProfile;
  onAgentUpdated: (updatedAgent: ZapProfile) => void;
}

const AgentEditModal: React.FC<AgentEditModalProps> = ({ isOpen, onClose, agent, onAgentUpdated }) => {
  const form = useForm<AgentEditFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: agent.full_name,
      isActive: agent.is_active,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: AgentEditFormValues) => {
    const toastId = showLoading("Atualizando corretor...");
    
    try {
      const updatedAgent = await adminTenantService.updateAgentProfile(agent.id, {
        full_name: values.fullName,
        is_active: values.isActive,
      });

      showSuccess(`Corretor(a) ${updatedAgent.full_name} atualizado(a) com sucesso!`);
      onAgentUpdated(updatedAgent);
      onClose();
    } catch (error) {
      console.error("Agent update error:", error);
      showError(error instanceof Error ? error.message : "Falha ao atualizar o corretor.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Corretor</DialogTitle>
          <DialogDescription>
            Ajuste o nome e o status de atividade do corretor.
          </DialogDescription>
        </DialogHeader>
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

            <div className="space-y-2">
                <Label>Email (ID)</Label>
                <Input value={agent.id.substring(0, 8) + '...'} disabled className="bg-muted/50" />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-x-2 pt-2">
                    <Label htmlFor="is-active-toggle" className="flex flex-col space-y-1">
                      <span>Status de Atividade</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        Corretores inativos não recebem novos leads.
                      </span>
                    </Label>
                    <FormControl>
                      <Switch
                        id="is-active-toggle"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                    <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentEditModal;