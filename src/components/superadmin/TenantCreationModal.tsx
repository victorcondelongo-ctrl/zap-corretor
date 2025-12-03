import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CreateTenantForm from "./CreateTenantForm";
import { ZapTenant, ZapProfile } from "@/services/zapCorretor";

interface TenantCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: (tenant: ZapTenant | ZapProfile) => void;
}

const TenantCreationModal: React.FC<TenantCreationModalProps> = ({ isOpen, onClose, onTenantCreated }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Corretora ou Corretor Avulso</DialogTitle>
          <DialogDescription>
            Preencha os detalhes para criar uma nova conta na plataforma.
          </DialogDescription>
        </DialogHeader>
        <CreateTenantForm onTenantCreated={onTenantCreated} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default TenantCreationModal;