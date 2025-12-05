import { useState } from "react";
import { agentService, UazapiConnectResponse } from "@/services/zapCorretor";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";

interface UseUazapiActionsResult {
  isCreating: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  createInstance: () => Promise<void>;
  connectInstance: (phone?: string) => Promise<UazapiConnectResponse | undefined>; // Adicionado 'phone?: string'
  disconnectInstance: () => Promise<void>;
}

export function useUazapiInstanceActions(refetchStatus: () => void): UseUazapiActionsResult {
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const createInstance = async () => {
    setIsCreating(true);
    const toastId = showLoading("Criando instância do WhatsApp...");
    try {
      await agentService.createInstance();
      showSuccess("Instância criada com sucesso! Conecte seu WhatsApp.");
      refetchStatus();
    } catch (error) {
      console.error("Create instance error:", error);
      showError(error instanceof Error ? error.message : "Falha ao criar a instância.");
    } finally {
      dismissToast(toastId);
      setIsCreating(false);
    }
  };

  const connectInstance = async (phone?: string): Promise<UazapiConnectResponse | undefined> => { // Adicionado 'phone?: string'
    setIsConnecting(true);
    const toastId = showLoading("Iniciando conexão...");
    try {
      const response = await agentService.connectInstance(phone); // Passando o phone para agentService
      
      if (response.qrcode_base64) {
        showSuccess("QR Code gerado. Escaneie para conectar.");
      } else if (response.pairingCode) {
        showSuccess("Pair Code gerado. Use o código para conectar.");
      } else {
        showSuccess("Conexão iniciada. Verifique o status em instantes.");
      }
      
      refetchStatus();
      return response;
    } catch (error) {
      console.error("Connect instance error:", error);
      showError(error instanceof Error ? error.message : "Falha ao iniciar a conexão.");
    } finally {
      dismissToast(toastId);
      setIsConnecting(false);
    }
  };

  const disconnectInstance = async () => {
    setIsDisconnecting(true);
    const toastId = showLoading("Desconectando WhatsApp...");
    try {
      await agentService.disconnectInstance();
      showSuccess("WhatsApp desconectado com sucesso.");
      refetchStatus();
    } catch (error) {
      console.error("Disconnect instance error:", error);
      showError(error instanceof Error ? error.message : "Falha ao desconectar.");
    } finally {
      dismissToast(toastId);
      setIsDisconnecting(false);
    }
  };

  return {
    isCreating,
    isConnecting,
    isDisconnecting,
    createInstance,
    connectInstance,
    disconnectInstance,
  };
}