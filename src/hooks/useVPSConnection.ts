import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VPSConnection {
  id: string;
  gerador_id: string;
  ip_fixo: string;
  porta: string | null;
  hostname: string | null;
  provider: string | null;
  validado: boolean | null;
  ultima_validacao: string | null;
  latencia_ms: number | null;
  uptime_percent: number | null;
  created_at: string;
  updated_at: string;
}

export function useVPSConnection(geradorId: string | null) {
  const [connection, setConnection] = useState<VPSConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConnection = useCallback(async () => {
    if (!geradorId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("vps_conexoes")
        .select("*")
        .eq("gerador_id", geradorId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setConnection(data as VPSConnection | null);
    } catch (err) {
      console.error("Error fetching VPS connection:", err);
      setError("Erro ao carregar conexão VPS");
    } finally {
      setIsLoading(false);
    }
  }, [geradorId]);

  const updateConnection = useCallback(async (config: Partial<VPSConnection>) => {
    if (!connection?.id) {
      toast({
        title: "Erro",
        description: "Nenhuma conexão VPS selecionada",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("vps_conexoes")
        .update({
          ip_fixo: config.ip_fixo,
          porta: config.porta,
          hostname: config.hostname,
          provider: config.provider,
        })
        .eq("id", connection.id);

      if (updateError) throw updateError;

      toast({
        title: "Configurações salvas",
        description: "As configurações da VPS foram atualizadas com sucesso.",
      });

      await fetchConnection();
    } catch (err) {
      console.error("Error updating VPS connection:", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [connection?.id, fetchConnection, toast]);

  const createConnection = useCallback(async (geradorId: string, config: Partial<VPSConnection>) => {
    setIsSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from("vps_conexoes")
        .insert({
          gerador_id: geradorId,
          ip_fixo: config.ip_fixo || "82.25.70.90",
          porta: config.porta || "15002",
          hostname: config.hostname || "7arrowsServe",
          provider: config.provider || "Contabo",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setConnection(data as VPSConnection);
      toast({
        title: "Conexão criada",
        description: "Configuração da VPS criada com sucesso.",
      });
    } catch (err) {
      console.error("Error creating VPS connection:", err);
      toast({
        title: "Erro ao criar",
        description: "Não foi possível criar a configuração da VPS.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const validateConnection = useCallback(async () => {
    if (!geradorId) return false;

    setIsSaving(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("validate-vps", {
        body: { gerador_id: geradorId },
      });

      if (invokeError) throw invokeError;

      const result = data as {
        validado: boolean;
        checks: {
          dados_recentes: { ok: boolean; leituras_5min: number; descricao: string };
          equipamento_hf: { ok: boolean; status: string };
          ultima_leitura: { timestamp: string | null; idade_segundos: number | null };
        };
        latencia_estimada_s: number | null;
      };

      toast({
        title: result.validado ? "VPS Validada ✓" : "VPS sem dados recentes",
        description: result.checks.dados_recentes.descricao,
        variant: result.validado ? "default" : "destructive",
      });

      await fetchConnection();
      return result.validado;
    } catch (err) {
      console.error("Error validating VPS connection:", err);
      toast({
        title: "Erro na validação",
        description: "Não foi possível validar a conexão.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [geradorId, fetchConnection, toast]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    isLoading,
    isSaving,
    error,
    updateConnection,
    createConnection,
    validateConnection,
    refetch: fetchConnection,
  };
}
