import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { adminTenantService } from "@/services/zapCorretor";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";

// Regex updated to accept 10 or 11 digits (DDD + Number)
const phoneSchema = z.string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, "O telefone deve ter 10 ou 11 dígitos (DDD + Número).");

const formSchema = z.object({
  phone: phoneSchema,
});

type BlockPhoneFormValues = z.infer<typeof formSchema>;

interface BlockPhoneFormProps {
  onPhoneBlocked: () => void;
}

const BlockPhoneForm: React.FC<BlockPhoneFormProps> = ({ onPhoneBlocked }) => {
  const { profile } = useSession();
  
  const form = useForm<BlockPhoneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: BlockPhoneFormValues) => {
    if (!profile || !profile.tenant_id) {
        showError("Erro de permissão: Tenant ID ausente.");
        return;
    }
    
    // Prepend 55 DDI before saving to DB, as the DB expects the full international format
    const fullPhone = `55${values.phone}`;

    const toastId = showLoading("Bloqueando telefone...");
    
    try {
      const { error } = await supabase
        .from('blocked_phones')
        .insert({
            tenant_id: profile.tenant_id,
            phone: fullPhone,
            imported_by_profile_id: profile.id,
        });

      if (error) {
        throw new Error(error.message);
      }

      showSuccess(`Telefone ${fullPhone} bloqueado com sucesso!`);
      form.reset();
      onPhoneBlocked();
    } catch (error) {
      console.error("Block phone error:", error);
      showError(error instanceof Error ? error.message : "Falha ao bloquear o telefone.");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="flex-grow">
              <FormLabel>Telefone (DDINúmero)</FormLabel>
              <FormControl>
                <Input 
                    placeholder="Ex: 11999999999 (DDD + Número)" 
                    {...field} 
                    // Ensure only digits are passed to the form state
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                    value={field.value.replace(/\D/g, '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                    <Plus className="w-4 h-4 mr-2" /> Bloquear
                </>
              )}
            </Button>
        </div>
      </form>
    </Form>
  );
};

export default BlockPhoneForm;