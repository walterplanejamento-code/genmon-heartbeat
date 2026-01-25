import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HFEquipment {
  id: string;
  gerador_id: string;
  modelo: string;
  ip_hf: string | null;
  ip_vps: string | null;
  porta_vps: string | null;
  porta_tcp_local: string | null;
  porta_serial: string | null;
  endereco_modbus: string | null;
  timeout_ms: number | null;
  status: string | null;
  baud_rate: number | null;
  data_bits: number | null;
  parity: string | null;
  stop_bits: number | null;
  last_connection_ip: string | null;
  last_connection_port: number | null;
  created_at: string;
  updated_at: string;
}

export type ConnectionStatus = "online" | "warning" | "offline";

function calculateConnectionStatus(updatedAt: string | null): ConnectionStatus {
  if (!updatedAt) return "offline";
  
  const lastUpdate = new Date(updatedAt);
  const now = new Date();
  const diffSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;
  
  if (diffSeconds < 30) return "online";
  if (diffSeconds < 120) return "warning";
  return "offline";
}

function formatTimeSince(updatedAt: string | null): string {
  if (!updatedAt) return "Nunca";
  
  const lastUpdate = new Date(updatedAt);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds}s atrás`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}min atrás`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h atrás`;
  return `${Math.floor(diffSeconds / 86400)}d atrás`;
}

export function useHFEquipment(geradorId: string | null) {
  const [equipment, setEquipment] = useState<HFEquipment | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("offline");
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>("Nunca");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEquipment = useCallback(async () => {
    if (!geradorId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("equipamentos_hf")
        .select("*")
        .eq("gerador_id", geradorId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Type assertion since new columns may not be in generated types yet
        const equipmentData = data as unknown as HFEquipment;
        setEquipment(equipmentData);
        setConnectionStatus(calculateConnectionStatus(equipmentData.updated_at));
        setTimeSinceUpdate(formatTimeSince(equipmentData.updated_at));
      } else {
        setEquipment(null);
        setConnectionStatus("offline");
      }
    } catch (err) {
      console.error("Error fetching HF equipment:", err);
      setError("Erro ao carregar equipamento");
    } finally {
      setIsLoading(false);
    }
  }, [geradorId]);

  const updateConfig = useCallback(async (config: Partial<HFEquipment>) => {
    if (!equipment?.id) {
      toast({
        title: "Erro",
        description: "Nenhum equipamento selecionado",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("equipamentos_hf")
        .update({
          modelo: config.modelo,
          ip_vps: config.ip_vps,
          porta_vps: config.porta_vps,
          porta_tcp_local: config.porta_tcp_local,
          porta_serial: config.porta_serial,
          endereco_modbus: config.endereco_modbus,
          timeout_ms: config.timeout_ms,
          // Serial config - cast to any since columns may not be in types yet
          ...(config.baud_rate && { baud_rate: config.baud_rate }),
          ...(config.data_bits && { data_bits: config.data_bits }),
          ...(config.parity && { parity: config.parity }),
          ...(config.stop_bits && { stop_bits: config.stop_bits }),
        } as any)
        .eq("id", equipment.id);

      if (updateError) throw updateError;

      toast({
        title: "Configurações salvas",
        description: "As configurações do HF2211 foram atualizadas com sucesso.",
      });

      await fetchEquipment();
    } catch (err) {
      console.error("Error updating HF equipment:", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [equipment?.id, fetchEquipment, toast]);

  const createEquipment = useCallback(async (geradorId: string) => {
    setIsSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from("equipamentos_hf")
        .insert({
          gerador_id: geradorId,
          modelo: "HF2211",
          ip_vps: "82.25.70.90",
          porta_vps: "15002",
          porta_tcp_local: "502",
          porta_serial: "/dev/ttyUSB0",
          endereco_modbus: "001",
          timeout_ms: 1000,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setEquipment(data as unknown as HFEquipment);
      toast({
        title: "Equipamento criado",
        description: "Configuração inicial do HF2211 criada com sucesso.",
      });
    } catch (err) {
      console.error("Error creating HF equipment:", err);
      toast({
        title: "Erro ao criar",
        description: "Não foi possível criar a configuração do equipamento.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Fetch on mount and when geradorId changes
  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!geradorId) return;

    const channel = supabase
      .channel(`hf-equipment-${geradorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "equipamentos_hf",
          filter: `gerador_id=eq.${geradorId}`,
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as unknown as HFEquipment;
            setEquipment(newData);
            setConnectionStatus(calculateConnectionStatus(newData.updated_at));
            setTimeSinceUpdate(formatTimeSince(newData.updated_at));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [geradorId]);

  // Update time since last update every 5 seconds
  useEffect(() => {
    if (!equipment?.updated_at) return;

    const interval = setInterval(() => {
      setConnectionStatus(calculateConnectionStatus(equipment.updated_at));
      setTimeSinceUpdate(formatTimeSince(equipment.updated_at));
    }, 5000);

    return () => clearInterval(interval);
  }, [equipment?.updated_at]);

  return {
    equipment,
    connectionStatus,
    timeSinceUpdate,
    isLoading,
    isSaving,
    error,
    updateConfig,
    createEquipment,
    refetch: fetchEquipment,
  };
}
