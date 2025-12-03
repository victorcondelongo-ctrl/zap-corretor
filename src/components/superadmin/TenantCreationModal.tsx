import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CreateTenantForm from "./CreateTenantForm";
import { ZapTenant } from "@/services/zapCorretor";

interface TenantCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: (tenant: ZapTenant) => void;
}

const TenantCreationModal: React.FC<TenantCreationModalProps> = ({ isOpen, onClose, onTenantCreated }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Corretora</DialogTitle>
          <DialogDescription>
            Preencha os detalhes para criar uma nova corretora e iniciar o período de teste.
          </DialogDescription>
        </DialogHeader>
        <CreateTenantForm onTenantCreated={onTenantCreated} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default TenantCreationModal;