import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CreateAgentForm from "./CreateAgentForm";

interface AgentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: () => void;
}

const AgentCreationModal: React.FC<AgentCreationModalProps> = ({ isOpen, onClose, onAgentCreated }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Corretor</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo usuário AGENT para sua corretora.
          </DialogDescription>
        </DialogHeader>
        <CreateAgentForm onAgentCreated={onAgentCreated} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default AgentCreationModal;