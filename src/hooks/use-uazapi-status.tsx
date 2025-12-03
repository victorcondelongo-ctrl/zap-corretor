import { useState, useEffect, useCallback } from "react";
import { agentService, UazapiStatus, UazapiStatusResponse } from "@/services/zapCorretor";
import { showError } from "@/utils/toast";

const POLLING_INTERVAL = 60000; // 60 seconds

interface UseUazapiStatusResult {
  statusData: UazapiStatusResponse | null;
  isLoadingStatus: boolean;
  errorStatus: string | null;
  refetchStatus: () => void;
}

export function useUazapiInstanceStatus(): UseUazapiStatusResult {
  const [statusData, setStatusData] = useState<UazapiStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setErrorStatus(null);
    try {
      const data = await agentService.getInstanceStatus();
      setStatusData(data);
    } catch (err) {
      console.error("Error fetching Uazapi status:", err);
      setErrorStatus(err instanceof Error ? err.message : "Erro ao carregar status da instância.");
      setStatusData(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial fetch
    fetchStatus();

    // 2. Polling setup
    const intervalId = setInterval(() => {
      console.log("[Uazapi Polling] Fetching status...");
      fetchStatus();
    }, POLLING_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchStatus]);

  return {
    statusData,
    isLoadingStatus,
    errorStatus,
    refetchStatus: fetchStatus,
  };
}