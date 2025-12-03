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
import { Loader2, UserPlus } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZapProfile, ZapLead, adminTenantService } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const formSchema = z.object({
  agentId: z.string().uuid("Selecione um corretor válido."),
});

type AssignmentFormValues = z.infer<typeof formSchema>;

interface LeadAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ZapLead;
  agents: ZapProfile[];
  onLeadAssigned: (updatedLead: ZapLead) => void;
}

const LeadAssignmentModal: React.FC<LeadAssignmentModalProps> = ({ isOpen, onClose, lead, agents, onLeadAssigned }) => {
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agentId: lead.agent_id || "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: AssignmentFormValues) => {
    const toastId = showLoading("Atribuindo lead manualmente...");
    
    try {
      const updatedLead = await adminTenantService.manualAssignLeadToAgent(lead.id, values.agentId);

      showSuccess(`Lead ${lead.phone} atribuído a ${agents.find(a => a.id === values.agentId)?.full_name || 'um corretor'}!`);
      onLeadAssigned(updatedLead);
      onClose();
    } catch (error) {
      console.error("Manual assignment error:", error);
      showError(error instanceof Error ? error.message : "Falha ao atribuir o lead.");
    } finally {
      dismissToast(toastId);
    }
  };
  
  const activeAgents = agents.filter(a => a.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Atribuição Manual de Lead</DialogTitle>
          <DialogDescription>
            Selecione o corretor para atribuir o lead {lead.phone}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="agentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corretor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um corretor ativo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.full_name} ({agent.is_active ? 'Ativo' : 'Inativo'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting || activeAgents.length === 0}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                    <UserPlus className="mr-2 h-4 w-4" /> Atribuir Lead
                </>
              )}
            </Button>
            {activeAgents.length === 0 && (
                <p className="text-sm text-destructive text-center">Nenhum corretor ativo disponível para atribuição.</p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadAssignmentModal;