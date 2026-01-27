import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AlertParam {
  id: string;
  gerador_id: string;
  parametro: string;
  valor_minimo: number | null;
  valor_maximo: number | null;
  nivel: string;
  habilitado: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: string;
  parameter: string;
  minValue: string;
  maxValue: string;
  level: "info" | "warning" | "critical";
  enabled: boolean;
}

const defaultRules: AlertRule[] = [
  { id: "tensao_gmg", parameter: "Tensão GMG", minValue: "370", maxValue: "400", level: "warning", enabled: true },
  { id: "temperatura_agua", parameter: "Temperatura Água", minValue: "0", maxValue: "95", level: "critical", enabled: true },
  { id: "nivel_combustivel", parameter: "Nível Combustível", minValue: "20", maxValue: "100", level: "warning", enabled: true },
  { id: "tensao_bateria", parameter: "Tensão Bateria", minValue: "22", maxValue: "28", level: "critical", enabled: true },
  { id: "frequencia_gmg", parameter: "Frequência GMG", minValue: "59", maxValue: "61", level: "warning", enabled: true },
];

export function useAlertParams(geradorId: string | null) {
  const [params, setParams] = useState<AlertParam[]>([]);
  const [rules, setRules] = useState<AlertRule[]>(defaultRules);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchParams = useCallback(async () => {
    if (!geradorId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("parametros_alerta")
        .select("*")
        .eq("gerador_id", geradorId);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setParams(data as AlertParam[]);
        // Convert DB params to rules format
        const dbRules: AlertRule[] = data.map((p) => ({
          id: p.id,
          parameter: p.parametro,
          minValue: String(p.valor_minimo || ""),
          maxValue: String(p.valor_maximo || ""),
          level: p.nivel as "info" | "warning" | "critical",
          enabled: p.habilitado ?? true,
        }));
        setRules(dbRules);
      }
    } catch (err) {
      console.error("Error fetching alert params:", err);
      setError("Erro ao carregar parâmetros de alerta");
    } finally {
      setIsLoading(false);
    }
  }, [geradorId]);

  const saveRules = useCallback(async (newRules: AlertRule[]) => {
    if (!geradorId) {
      toast({
        title: "Erro",
        description: "Nenhum gerador selecionado",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Delete existing params
      await supabase
        .from("parametros_alerta")
        .delete()
        .eq("gerador_id", geradorId);

      // Insert new params
      const paramsToInsert = newRules.map((rule) => ({
        gerador_id: geradorId,
        parametro: rule.parameter,
        valor_minimo: rule.minValue ? parseFloat(rule.minValue) : null,
        valor_maximo: rule.maxValue ? parseFloat(rule.maxValue) : null,
        nivel: rule.level,
        habilitado: rule.enabled,
      }));

      const { error: insertError } = await supabase
        .from("parametros_alerta")
        .insert(paramsToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Regras salvas",
        description: "As regras de alerta foram atualizadas com sucesso.",
      });

      await fetchParams();
    } catch (err) {
      console.error("Error saving alert params:", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as regras de alerta.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [geradorId, fetchParams, toast]);

  useEffect(() => {
    fetchParams();
  }, [fetchParams]);

  return {
    params,
    rules,
    setRules,
    isLoading,
    isSaving,
    error,
    saveRules,
    refetch: fetchParams,
  };
}
