import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Reading {
  id: string;
  gerador_id: string;
  tensao_rede_rs: number | null;
  tensao_rede_st: number | null;
  tensao_rede_tr: number | null;
  tensao_gmg: number | null;
  corrente_fase1: number | null;
  frequencia_gmg: number | null;
  rpm_motor: number | null;
  temperatura_agua: number | null;
  tensao_bateria: number | null;
  horas_trabalhadas: number | null;
  numero_partidas: number | null;
  nivel_combustivel: number | null;
  motor_funcionando: boolean;
  rede_ok: boolean;
  gmg_alimentando: boolean;
  aviso_ativo: boolean;
  falha_ativa: boolean;
  created_at: string;
  // Horímetro separado em campos (formato: HHHHH:MM:SS)
  horimetro_horas: number | null;
  horimetro_minutos: number | null;
  horimetro_segundos: number | null;
}

export interface Alert {
  id: string;
  gerador_id: string;
  leitura_id: string | null;
  nivel: "info" | "warning" | "critical";
  mensagem: string;
  origem: "rule" | "ai";
  resolvido: boolean;
  resolvido_em: string | null;
  created_at: string;
}

export function useRealtimeReadings(geradorId: string | null) {
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestReading = useCallback(async () => {
    if (!geradorId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("leituras_tempo_real")
        .select("*")
        .eq("gerador_id", geradorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching reading:", fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        setLatestReading(data as Reading);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(String(err));
    }
  }, [geradorId]);

  useEffect(() => {
    if (!geradorId) return;

    // Fetch initial data
    fetchLatestReading();

    // Subscribe to realtime updates
    const channel: RealtimeChannel = supabase
      .channel(`readings-${geradorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leituras_tempo_real",
          filter: `gerador_id=eq.${geradorId}`,
        },
        (payload) => {
          console.log("New reading received:", payload.new);
          setLatestReading(payload.new as Reading);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [geradorId, fetchLatestReading]);

  return { latestReading, isConnected, error, refetch: fetchLatestReading };
}

export function useRealtimeAlerts(geradorId: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!geradorId) return;

    try {
      const { data, error } = await supabase
        .from("alertas")
        .select("*")
        .eq("gerador_id", geradorId)
        .eq("resolvido", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching alerts:", error);
        return;
      }

      if (data) {
        setAlerts(data as Alert[]);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  }, [geradorId]);

  useEffect(() => {
    if (!geradorId) return;

    // Fetch initial alerts
    fetchAlerts();

    // Subscribe to realtime updates
    const channel: RealtimeChannel = supabase
      .channel(`alerts-${geradorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alertas",
          filter: `gerador_id=eq.${geradorId}`,
        },
        (payload) => {
          console.log("New alert received:", payload.new);
          setAlerts((prev) => [payload.new as Alert, ...prev].slice(0, 10));
        }
      )
      .subscribe((status) => {
        console.log("Alerts subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [geradorId, fetchAlerts]);

  return { alerts, isConnected, refetch: fetchAlerts };
}
